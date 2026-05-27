import { NextResponse } from "next/server";

const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT?.trim();
  const apiKey = process.env.PINATA_API_KEY?.trim();
  const apiSecret = process.env.PINATA_API_SECRET?.trim();
  const hasApiPair = Boolean(apiKey && apiSecret);

  if (!jwt && !hasApiPair) {
    return NextResponse.json({ error: "Pinata credentials are not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body && typeof body === "object" && "payload" in body ? (body as { payload: unknown }).payload : undefined;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Missing metadata payload." }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (hasApiPair) {
    headers.pinata_api_key = apiKey!;
    headers.pinata_secret_api_key = apiSecret!;
  } else {
    headers.Authorization = `Bearer ${jwt}`;
  }

  const pinataResponse = await fetch(PINATA_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      pinataContent: payload,
      pinataMetadata: {
        name: "blindhire-metadata.json",
      },
    }),
  });

  if (!pinataResponse.ok) {
    return NextResponse.json({ error: "Pinata upload failed." }, { status: 502 });
  }

  const result = (await pinataResponse.json()) as { IpfsHash?: string };
  if (!result.IpfsHash) {
    return NextResponse.json({ error: "Pinata did not return an IPFS hash." }, { status: 502 });
  }

  return NextResponse.json({ uri: `ipfs://${result.IpfsHash}` });
}
