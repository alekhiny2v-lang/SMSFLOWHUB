import { MongoClient, Db } from "mongodb";
import type { Table } from "./schema";
import type { Column, Predicate, Sort } from "./query";

const configuredUri = process.env.MONGODB_URI;

const globalForMongo = globalThis as typeof globalThis & {
  __smsflowMongoClient?: MongoClient;
  __smsflowMongoDb?: Db;
};
let client = globalForMongo.__smsflowMongoClient;
let dbPromise: Promise<Db> | undefined;
async function getDb() {
  if (!dbPromise) {
    if (!configuredUri) throw new Error("MONGODB_URI is required");
    client = client ?? new MongoClient(configuredUri);
    globalForMongo.__smsflowMongoClient = client;
    dbPromise = client.connect().then((connection) => {
      const databaseName = process.env.MONGODB_DB || new URL(configuredUri).pathname.slice(1) || "smsflow";
      return connection.db(databaseName);
    });
  }
  return dbPromise;
}

function field(value: unknown): string | undefined {
  return value && typeof value === "object" && "field" in value ? String((value as Column).field) : undefined;
}
function valueFor(row: Record<string, any>, value: unknown): unknown {
  const column = value && typeof value === "object" && "field" in value ? value as Column : undefined;
  if (!column) return value;
  return row.__joined?.[column.table]?.[column.field] ?? row[column.field];
}
function project(row: Record<string, unknown>, projection?: Record<string, unknown>): Record<string, unknown> {
  if (!projection) return row;
  return Object.fromEntries(Object.entries(projection).map(([key, value]) => {
    const valueField = field(value);
    if (valueField) return [key, valueFor(row, value)];
    if (value && typeof value === "object") return [key, project(row, value as Record<string, unknown>)];
    return [key, value];
  }));
}

class SelectQuery implements PromiseLike<any[]> {
  private source?: Table;
  private predicate?: Predicate;
  private sorts: Sort[] = [];
  private limitValue?: number;
  private joins: { source: Table; condition: Predicate }[] = [];
  constructor(private readonly projection?: Record<string, unknown>) {}
  from(source: Table) { this.source = source; return this; }
  where(predicate: Predicate) { this.predicate = this.predicate ? ((row) => this.predicate!(row) && predicate(row)) : predicate; return this; }
  orderBy(...sorts: (Sort | Column)[]) { this.sorts.push(...sorts.map((sort) => "direction" in sort ? sort : { column: sort, direction: 1 as const })); return this; }
  limit(value: number) { this.limitValue = value; return this; }
  leftJoin(source: Table, condition: Predicate) { this.joins.push({ source, condition }); return this; }
  async then<TResult1 = any[], TResult2 = never>(onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
    try {
      const collection = (await getDb()).collection(this.source!.collection);
      let rows = await collection.find({}).toArray() as unknown as Record<string, unknown>[];
      for (const join of this.joins) {
        const joinedRows = await (await getDb()).collection(join.source.collection).find({}).toArray() as unknown as Record<string, unknown>[];
        rows = rows.map((row) => {
          const rightColumn = join.condition.right && typeof join.condition.right === "object" && "field" in join.condition.right ? join.condition.right as Column : undefined;
          const joined = rightColumn
            ? joinedRows.find((candidate) => candidate[rightColumn.field] === row[join.condition.left!.field])
            : undefined;
          return { ...row, __joined: { ...(row.__joined as object), [join.source.collection]: joined } };
        });
      }
      if (this.predicate) rows = rows.filter(this.predicate);
      for (const sort of [...this.sorts].reverse()) rows.sort((a, b) => {
        const left = a[sort.column.field] as any; const right = b[sort.column.field] as any;
        return left === right ? 0 : left > right ? sort.direction : -sort.direction;
      });
      if (this.limitValue !== undefined) rows = rows.slice(0, this.limitValue);
      const result = rows.map((row) => project(row, this.projection));
      return onfulfilled ? onfulfilled(result) : result as TResult1;
    } catch (error) { return onrejected ? onrejected(error) : Promise.reject(error); }
  }
}

class MutationQuery implements PromiseLike<any[]> {
  private valuesList: Record<string, unknown>[] = [];
  private changes: Record<string, unknown> = {};
  private predicate?: Predicate;
  private projection?: Record<string, unknown>;
  constructor(private readonly operation: "insert" | "update" | "delete", private readonly source: Table) {}
  values(values: Record<string, unknown> | Record<string, unknown>[]) { this.valuesList = Array.isArray(values) ? values : [values]; return this; }
  set(changes: Record<string, unknown>) { this.changes = changes; return this; }
  where(predicate: Predicate) { this.predicate = predicate; return this; }
  returning(projection?: Record<string, unknown>) { this.projection = projection; return this; }
  async then<TResult1 = any[], TResult2 = never>(onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
    try {
      const collection = (await getDb()).collection(this.source.collection);
      let result: Record<string, unknown>[] = [];
      if (this.operation === "insert") {
        const documents = this.valuesList.map((value) => ({ ...value, id: value.id ?? Date.now() + Math.floor(Math.random() * 100000), createdAt: value.createdAt ?? new Date(), updatedAt: value.updatedAt ?? new Date() }));
        if (documents.length) await collection.insertMany(documents);
        result = documents;
      } else {
        const documents = await collection.find({}).toArray() as unknown as Record<string, unknown>[];
        for (const document of documents.filter(this.predicate || (() => true))) {
          const selector = { _id: document._id as any };
          if (this.operation === "update") { await collection.updateOne(selector, { $set: this.changes }); result.push({ ...document, ...this.changes }); }
          else { await collection.deleteOne(selector); result.push(document); }
        }
      }
      const output = result.map((row) => project(row, this.projection));
      return onfulfilled ? onfulfilled(output) : output as TResult1;
    } catch (error) { return onrejected ? onrejected(error) : Promise.reject(error); }
  }
}

class MongoDb {
  select(projection?: Record<string, unknown>) { return new SelectQuery(projection); }
  insert(source: Table) { return new MutationQuery("insert", source); }
  update(source: Table) { return new MutationQuery("update", source); }
  delete(source: Table) { return new MutationQuery("delete", source); }
  async execute(_query?: unknown) { await getDb(); return [{ result: 1 }]; }
  async transaction<T>(callback: (transaction: MongoDb) => Promise<T>) { return callback(this); }
}

export const db = new MongoDb();
