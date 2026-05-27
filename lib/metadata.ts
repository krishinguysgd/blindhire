export type MetadataMap = Record<string, string | number | boolean | string[]>;

export function encodeMetadata(payload: MetadataMap) {
  return JSON.stringify(payload);
}

export function decodeMetadata(value: string): MetadataMap {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as MetadataMap) : {};
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

type WholeBigIntOptions = {
  min?: bigint;
  max?: bigint;
};

export function asWholeBigInt(value: string, label = "Value", options: WholeBigIntOptions = {}) {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) throw new Error(`${label} must be a whole number.`);

  const parsed = BigInt(normalized);
  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${label} must be at least ${options.min.toString()}.`);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${label} must be at most ${options.max.toString()}.`);
  }
  return parsed;
}

export function asPositiveBigInt(value: string, label = "ID") {
  return asWholeBigInt(value, label, { min: 1n });
}

export function inputErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Invalid form input.";
}

const UINT32_MAX = 4_294_967_295n;

export function asUint32(value: string, label = "Value", options: WholeBigIntOptions = {}) {
  return asWholeBigInt(value, label, {
    min: options.min ?? 0n,
    max: options.max ?? UINT32_MAX,
  });
}
