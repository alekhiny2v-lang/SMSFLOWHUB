export type Column = { table: string; field: string };
export type Predicate = ((row: Record<string, unknown>) => boolean) & { left?: Column; right?: unknown };
export type Sort = { column: Column; direction: 1 | -1 };

export const eq = (column: Column, value: unknown): Predicate => {
  const predicate = ((row: Record<string, unknown>) => {
    const rightColumn = value && typeof value === "object" && "field" in value ? value as Column : undefined;
    return row[column.field] === (rightColumn ? row[rightColumn.field] : value);
  }) as Predicate;
  predicate.left = column;
  predicate.right = value;
  return predicate;
};
export const and = (...predicates: Predicate[]): Predicate => (row) => predicates.every((predicate) => predicate(row));
export const like = (column: Column, value: string): Predicate => {
  const pattern = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
  const regex = new RegExp(`^${pattern}$`, "i");
  return (row) => regex.test(String(row[column.field] ?? ""));
};
export const desc = (column: Column): Sort => ({ column, direction: -1 });
