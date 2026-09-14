/**
 * Shared helpers for the proxy store (admin + client pages).
 */

/** Format a traffic amount stored in GB for display ("1 GB" / "512 MB"). */
export function formatTraffic(trafficGb: number | string | null | undefined): string {
  const gb = Number(trafficGb || 0);
  if (gb <= 0) return "-";
  return gb >= 1 ? `${gb} GB` : `${Math.round(gb * 1024)} MB`;
}

/** Standard credentials line: host:port:username:password */
export function buildCredentials(host: string, port: string, username: string, password: string): string {
  return `${host}:${port}:${username}:${password}`;
}

export interface ParsedProxyLine {
  host: string;
  port: string;
  username: string;
  password: string;
}

/**
 * Parse one "host:port:username:password" line. Tolerates extra colons inside
 * the username by treating the first two and the last field as fixed parts.
 */
export function parseProxyLine(line: string): ParsedProxyLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const [host, port] = parts;
    if (!host || !port) return null;
    return { host, port, username: "", password: "" };
  }
  if (parts.length >= 4) {
    const host = parts[0];
    const port = parts[1];
    const password = parts[parts.length - 1];
    const username = parts.slice(2, parts.length - 1).join(":");
    if (!host || !port || !username || !password) return null;
    return { host, port, username, password };
  }
  return null;
}

/** Parse a bulk paste of one proxy per line; invalid lines are reported. */
export function parseBulkProxyLines(text: string): { valid: ParsedProxyLine[]; invalid: string[] } {
  const valid: ParsedProxyLine[] = [];
  const invalid: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parsed = parseProxyLine(line);
    if (parsed) valid.push(parsed);
    else invalid.push(line.trim());
  }
  return { valid, invalid };
}
