import { Encryptable } from "@cofhe/sdk";
import { chains as cofheChains } from "@cofhe/sdk/chains";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, http, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

type EncryptedInput = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: Hex;
};

const artifact = JSON.parse(
  readFileSync(join(process.cwd(), "artifacts/contracts/BlindHire.sol/BlindHire.json"), "utf8"),
) as { abi: unknown[] };
const blindHireAbi = artifact.abi;

const contractAddress =
  process.env.BLINDHIRE_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS;
const rawPrivateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const demoSeed = process.env.DEMO_SEED || new Date().toISOString();

function privateKey() {
  if (!rawPrivateKey) throw new Error("PRIVATE_KEY is required.");
  return (rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`) as Hex;
}

function asContractInput(input: { ctHash: bigint; securityZone: number; utype: number; signature: string }): EncryptedInput {
  return {
    ctHash: input.ctHash,
    securityZone: input.securityZone,
    utype: input.utype,
    signature: input.signature as Hex,
  };
}

function encodeMetadata(payload: Record<string, string | string[]>) {
  return JSON.stringify(payload);
}

async function waitFor(hash: Hex, publicClient: ReturnType<typeof createPublicClient>) {
  console.log(`Submitted ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);
}

async function main() {
  if (!contractAddress) throw new Error("Set BLINDHIRE_CONTRACT_ADDRESS or NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS.");

  const account = privateKeyToAccount(privateKey());
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });
  const cofheClient = createCofheClient(
    createCofheConfig({
      supportedChains: [cofheChains.sepolia],
    }),
  );
  await cofheClient.connect(publicClient, walletClient);

  console.log(`Seeding BlindHire at ${contractAddress}`);
  console.log(`Using account ${account.address}`);
  console.log(`Demo seed ${demoSeed}`);

  const candidateInputs = (
    await cofheClient
    .encryptInputs([
      Encryptable.uint32(92n),
      Encryptable.uint32(5n),
      Encryptable.uint32(130_000n),
      Encryptable.uint32(170_000n),
    ])
      .execute()
  ).map(asContractInput);

  const candidateURI = encodeMetadata({
    kind: "candidate",
    alias: "g5b16r",
    role: "Senior Frontend Protocol Engineer",
    headline: "5 years React, three DeFi products shipped, smart-contract audit literacy.",
    skills: ["React", "TypeScript", "Solidity", "DeFi"],
    projects: ["DEX analytics console", "wallet security dashboard", "governance tooling"],
  });

  await waitFor(
    await walletClient.writeContract({
      address: contractAddress as Hex,
      abi: blindHireAbi,
      functionName: "createCandidate",
      args: [
        candidateURI,
        keccak256(toBytes(`blindhire-live-demo-candidate:${demoSeed}`)),
        candidateInputs[0],
        candidateInputs[1],
        candidateInputs[2],
        candidateInputs[3],
      ],
    }),
    publicClient,
  );

  const candidateCount = await publicClient.readContract({
    address: contractAddress as Hex,
    abi: blindHireAbi,
    functionName: "candidateCount",
  });
  const candidateId = candidateCount as bigint;

  const proofURI = encodeMetadata({
    kind: "skill-proof",
    title: `GitHub ownership and shipped protocol UI (${demoSeed})`,
    issuer: "BlindHire demo verifier",
    link: "https://github.com/example/protocol-ui",
  });

  await waitFor(
    await walletClient.writeContract({
      address: contractAddress as Hex,
      abi: blindHireAbi,
      functionName: "addSkillProof",
      args: [candidateId, proofURI, keccak256(toBytes(proofURI))],
    }),
    publicClient,
  );

  await waitFor(
    await walletClient.writeContract({
      address: contractAddress as Hex,
      abi: blindHireAbi,
      functionName: "verifySkillProof",
      args: [candidateId, 0n],
    }),
    publicClient,
  );

  const jobInputs = (
    await cofheClient
    .encryptInputs([
      Encryptable.uint32(85n),
      Encryptable.uint32(4n),
      Encryptable.uint32(125_000n),
      Encryptable.uint32(175_000n),
    ])
      .execute()
  ).map(asContractInput);

  const jobURI = encodeMetadata({
    kind: "job",
    company: "CipherWorks Labs",
    role: "Senior Frontend Protocol Engineer",
    description: "Own wallet flows, private matching dashboards, and security-sensitive product surfaces.",
    requirements: ["React", "TypeScript", "DeFi", "wallet UX"],
  });

  await waitFor(
    await walletClient.writeContract({
      address: contractAddress as Hex,
      abi: blindHireAbi,
      functionName: "postJob",
      args: [jobURI, jobInputs[0], jobInputs[1], jobInputs[2], jobInputs[3]],
    }),
    publicClient,
  );

  const jobCount = await publicClient.readContract({
    address: contractAddress as Hex,
    abi: blindHireAbi,
    functionName: "jobCount",
  });
  const jobId = jobCount as bigint;
  const aiSignal = (await cofheClient.encryptInputs([Encryptable.uint32(94n)]).execute()).map(asContractInput);

  await waitFor(
    await walletClient.writeContract({
      address: contractAddress as Hex,
      abi: blindHireAbi,
      functionName: "createMatch",
      args: [candidateId, jobId, aiSignal[0]],
    }),
    publicClient,
  );

  const matchCount = await publicClient.readContract({
    address: contractAddress as Hex,
    abi: blindHireAbi,
    functionName: "matchCount",
  });

  console.log(`Seed complete: candidate #${candidateId}, job #${jobId}, match #${matchCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
