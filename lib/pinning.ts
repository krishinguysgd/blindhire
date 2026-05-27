import type { MetadataMap } from "@/lib/metadata";
import { metadataUri } from "@/lib/storage";

type PrepareMetadataOptions = {
  externalUri?: string;
  label?: string;
  onStatus?: (message: string) => void;
};

export async function prepareMetadata(payload: MetadataMap, options: PrepareMetadataOptions = {}) {
  const normalized = options.externalUri?.trim();
  if (normalized) return metadataUri(payload, normalized);

  try {
    options.onStatus?.(`Pinning ${options.label || "metadata"} to IPFS.`);
    const response = await fetch("/api/metadata/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (!response.ok) throw new Error("Pinata upload unavailable.");

    const result = (await response.json()) as { uri?: string };
    if (!result.uri) throw new Error("Pinata upload did not return a URI.");

    options.onStatus?.(`${options.label || "Metadata"} pinned to IPFS.`);
    return result.uri;
  } catch {
    options.onStatus?.(`IPFS pinning unavailable; using inline ${options.label || "metadata"}.`);
    return metadataUri(payload);
  }
}
