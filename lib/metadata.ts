export type MetadataMap = Record<string, string | number | boolean | string[]>;

export function encodeMetadata(payload: MetadataMap) {
  return JSON.stringify(payload);
}

export function decodeMetadata(value: string): MetadataMap {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as MetadataMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return { raw: value };
  }
}

export function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function shortAddress(value?: string) {
  if (!value) return "Not connected";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatSalary(value: string | number | bigint | undefined) {
  if (value === undefined || value === "") return "Private";
  const numeric = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function asUint32(value: string) {
  const normalized = Number.parseInt(value || "0", 10);
  if (!Number.isFinite(normalized) || normalized < 0) return 0n;
  return BigInt(Math.min(normalized, 4_294_967_295));
}
