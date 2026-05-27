import { encodePacked, keccak256, toBytes, type Hex } from "viem";
import { decodeMetadata, encodeMetadata, type MetadataMap } from "@/lib/metadata";

const permanentUriPattern = /^(ipfs:\/\/|ar:\/\/)/i;

export function isPermanentMetadataUri(value: string) {
  return permanentUriPattern.test(value.trim());
}

export function metadataUri(payload: MetadataMap, externalUri?: string) {
  const normalized = externalUri?.trim();
  if (normalized && isPermanentMetadataUri(normalized)) return normalized;
  return encodeMetadata(normalized ? { ...payload, externalUri: normalized } : payload);
}

export function metadataContentHash(uri: string) {
  return keccak256(toBytes(uri));
}

export function identitySalt(secret: string) {
  return keccak256(toBytes(secret.trim())) as Hex;
}

export function identityCommitment(identityURI: string, salt: Hex) {
  return keccak256(encodePacked(["string", "bytes32"], [identityURI, salt]));
}

export function metadataGatewayUrl(uri: string) {
  const normalized = uri.trim();
  if (/^ipfs:\/\//i.test(normalized)) {
    const gateway = process.env.NEXT_PUBLIC_METADATA_GATEWAY_URL || "https://ipfs.io/ipfs/";
    return `${gateway.replace(/\/?$/, "/")}${normalized.replace(/^ipfs:\/\//i, "")}`;
  }
  if (/^ar:\/\//i.test(normalized)) {
    return `https://arweave.net/${normalized.replace(/^ar:\/\//i, "")}`;
  }
  return normalized;
}

export async function resolveMetadata(value: string): Promise<MetadataMap> {
  if (!isPermanentMetadataUri(value)) return decodeMetadata(value);

  try {
    const response = await fetch(metadataGatewayUrl(value), { cache: "force-cache" });
    if (!response.ok) return decodeMetadata(value);

    const metadata = decodeMetadata(await response.text());
    return { ...metadata, sourceUri: value };
  } catch {
    return decodeMetadata(value);
  }
}

export async function resolveMetadataValue(value: string) {
  if (!isPermanentMetadataUri(value)) return value;
  return encodeMetadata(await resolveMetadata(value));
}
