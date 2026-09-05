import { MongoClient, Db } from "mongodb";
import type { Table } from "./schema";
import type { Column, Predicate, Sort } from "./query";

/**
 * Fail fast instead of hanging.
 *
 * The driver defaults to a 30s server-selection window, which is longer than
 * the 10s execution limit most serverless hosts impose: an unreachable cluster
 * (wrong URI, Atlas IP allowlist, paused cluster) made every request run until
 * the platform killed it, which surfaced as the generic "A server error
 * occurred" page. 8s leaves room to answer with a real error message.
 */
const SERVER_SELECTION_TIMEOUT_MS = 8_000;
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * How long to keep failing fast after a connection failure.
 *
 * Pages such as the admin dashboard run several queries; without this, a dead
 * cluster made each of them burn the full 8s timeout and the request blew past
 * the serverless execution limit anyway. After one failure we answer instantly
 * with the cached error for a few seconds, then try again.
 */
const FAILURE_COOLDOWN_MS = 5_000;

const globalForMongo = globalThis as typeof globalThis & {
  __smsflowMongoClient?: MongoClient;
  __smsflowMongoDb?: Db;
  __smsflowMongoFailure?: { at: number; message: string };
};
let client = globalForMongo.__smsflowMongoClient;
let dbPromise: Promise<Db> | undefined;
let lastFailure = globalForMongo.__smsflowMongoFailure;

/** Drop the cached client/promise so the next request reconnects from scratch. */
async function resetConnection() {
  dbPromise = undefined;
  globalForMongo.__smsflowMongoDb = undefined;
  const stale = client;
  client = undefined;
  globalForMongo.__smsflowMongoClient = undefined;
  if (stale) {
    try {
      await stale.close(true);
    } catch {
      // The client was already broken — nothing to clean up.
    }
  }
}

async function getDb() {
  if (dbPromise) return dbPromise;

  // Circuit breaker: report the known-bad state immediately instead of paying
  // the full connect timeout on every query of the request.
  if (lastFailure && Date.now() - lastFailure.at < FAILURE_COOLDOWN_MS) {
    throw new Error(lastFailure.message);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Add it to your deployment environment variables and redeploy.");
  }

  client = client ?? new MongoClient(uri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
  });
  globalForMongo.__smsflowMongoClient = client;

  dbPromise = client.connect().then((connection) => {
    let databaseName = process.env.MONGODB_DB;
    if (!databaseName) {
      try {
        databaseName = new URL(uri).pathname.slice(1);
      } catch {
        databaseName = "";
      }
    }
    const database = connection.db(databaseName || "smsflow");
    globalForMongo.__smsflowMongoDb = database;
    return database;
  });

  // A rejected promise used to be cached forever, so one transient failure
  // (cold start, network blip, Atlas maintenance) permanently broke every
  // route for the lifetime of the process. Remember the failure, drop the
  // client, and retry from scratch on the next request.
  dbPromise.catch((error: unknown) => {
    lastFailure = { at: Date.now(), message: (error as Error)?.message || "Database connection failed" };
    globalForMongo.__smsflowMongoFailure = lastFailure;
    void resetConnection();
  });

  // Clear the breaker once we know the cluster answers again.
  dbPromise.then(() => {
    lastFailure = undefined;
    globalForMongo.__smsflowMongoFailure = undefined;
  }).catch(() => undefined);

  return dbPromise;
}

/**
 * Lightweight connectivity check used by `/api/health`. Returns null when the
 * database answers, or the reason it does not.
 */
export async function checkDbHealth(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Translate a simple predicate tree (eq / and / like with literal values) into a
 * MongoDB query filter so queries hit the server instead of loading full
 * collections into memory. Returns undefined when the predicate cannot be
 * expressed as a Mongo filter (e.g. column-to-column comparisons).
 */
function toMongoFilter(predicate?: Predicate): Record<string, unknown> | undefined {
  if (!predicate) return undefined;
  if (predicate.andParts) {
    const merged: Record<string, unknown> = {};
    for (const part of predicate.andParts) {
      const filter = toMongoFilter(part);
      if (!filter) return undefined;
      Object.assign(merged, filter);
    }
    return merged;
  }
  if (predicate.likeField && predicate.likeRegex) {
    const flags = predicate.likeRegex.flags;
    const options = flags.includes("i") && !flags.includes("I") ? "i" : undefined;
    const condition: Record<string, unknown> = { $regex: predicate.likeRegex.source };
    if (options) condition.$options = options;
    return { [predicate.likeField.field]: condition };
  }
  if (predicate.left) {
    if (predicate.right && typeof predicate.right === "object" && "field" in predicate.right) return undefined;
    return { [predicate.left.field]: predicate.right };
  }
  return undefined;
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
      const mongoFilter = toMongoFilter(this.predicate);
      // Push the filter down to MongoDB (indexed) instead of scanning the
      // whole collection and filtering in memory.
      let rows = await collection.find(mongoFilter ?? {}).toArray() as unknown as Record<string, unknown>[];
      for (const join of this.joins) {
        const joinCollection = (await getDb()).collection(join.source.collection);
        const rightColumn = join.condition.right && typeof join.condition.right === "object" && "field" in join.condition.right ? join.condition.right as Column : undefined;
        if (join.condition.left && rightColumn) {
          // Build a hash map once → O(n + m) lookups instead of O(n * m) scans.
          const byKey = new Map<unknown, Record<string, unknown>>();
          for (const candidate of (await joinCollection.find({}).toArray()) as unknown as Record<string, unknown>[]) {
            if (!byKey.has(candidate[rightColumn.field])) byKey.set(candidate[rightColumn.field], candidate);
          }
          const leftField = join.condition.left.field;
          rows = rows.map((row) => ({
            ...row,
            __joined: { ...(row.__joined as object), [join.source.collection]: byKey.get(row[leftField]) },
          }));
        } else {
          const joinedRows = (await joinCollection.find({}).toArray()) as unknown as Record<string, unknown>[];
          rows = rows.map((row) => {
            const joined = rightColumn
              ? joinedRows.find((candidate) => candidate[rightColumn.field] === row[join.condition.left!.field])
              : undefined;
            return { ...row, __joined: { ...(row.__joined as object), [join.source.collection]: joined } };
          });
        }
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
      } else if (this.operation === "update") {
        const mongoFilter = toMongoFilter(this.predicate);
        if (mongoFilter) {
          // One filtered read + one filtered update instead of a full scan +
          // N writes. Read before the update because the filter may stop
          // matching after the $set (e.g. status "pending" → "completed").
          const matched = ((await collection.find(mongoFilter).toArray()) as unknown as Record<string, unknown>[]);
          if (matched.length > 0) {
            await collection.updateMany(mongoFilter, { $set: this.changes });
            result = matched.map((document) => ({ ...document, ...this.changes }));
          }
        } else {
          const documents = await collection.find({}).toArray() as unknown as Record<string, unknown>[];
          for (const document of documents.filter(this.predicate || (() => true))) {
            await collection.updateOne({ _id: document._id as any }, { $set: this.changes });
            result.push({ ...document, ...this.changes });
          }
        }
      } else {
        const mongoFilter = toMongoFilter(this.predicate);
        if (mongoFilter) {
          await collection.deleteMany(mongoFilter);
        } else {
          const documents = await collection.find({}).toArray() as unknown as Record<string, unknown>[];
          for (const document of documents.filter(this.predicate || (() => true))) {
            await collection.deleteOne({ _id: document._id as any });
            result.push(document);
          }
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
