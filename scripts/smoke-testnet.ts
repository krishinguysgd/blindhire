import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, http, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";

const artifact = JSON.parse(
  readFileSync(join(process.cwd(), "artifacts/contracts/BlindHire.sol/BlindHire.json"), "utf8"),
) as { abi: unknown[]; deployedBytecode?: Hex };

for (const fileName of [".env.local", ".env"]) {
  try {
    const lines = readFileSync(join(process.cwd(), fileName), "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      process.env[key] ||= valueParts.join("=");
    }
  } catch {
    // Optional local env file.
  }
}

const contractAddress =
  process.env.BLINDHIRE_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS;
const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

async function main() {
  if (!contractAddress) throw new Error("Set BLINDHIRE_CONTRACT_ADDRESS or NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS.");
  if (!artifact.deployedBytecode || artifact.deployedBytecode === "0x") {
    throw new Error("Compile contracts before running smoke:sepolia so deployedBytecode is available.");
  }

  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const address = contractAddress as Address;
  const [chainId, blockNumber, deployedCode, owner, candidateCount, jobCount, matchCount, verifierThreshold] = await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getCode({ address }),
    client.readContract({ address, abi: artifact.abi, functionName: "owner" }),
    client.readContract({ address, abi: artifact.abi, functionName: "candidateCount" }),
    client.readContract({ address, abi: artifact.abi, functionName: "jobCount" }),
    client.readContract({ address, abi: artifact.abi, functionName: "matchCount" }),
    client.readContract({ address, abi: artifact.abi, functionName: "verifierApprovalThreshold" }),
  ]);

  if (chainId !== sepolia.id) throw new Error(`Connected to chain ${chainId}, expected ${sepolia.id}.`);
  if (!deployedCode || deployedCode === "0x") throw new Error(`No contract bytecode found at ${contractAddress}.`);

  const expectedBytecode = artifact.deployedBytecode.toLowerCase();
  const actualBytecode = deployedCode.toLowerCase();
  if (actualBytecode !== expectedBytecode) {
    const expectedBytes = (expectedBytecode.length - 2) / 2;
    const actualBytes = (actualBytecode.length - 2) / 2;
    throw new Error(
      `Deployed bytecode mismatch at ${contractAddress}. On-chain ${actualBytes} bytes, local artifact ${expectedBytes} bytes. Redeploy and update env before launch.`,
    );
  }

  console.log(`BlindHire smoke OK`);
  console.log(`Contract ${contractAddress}`);
  console.log(`Bytecode matches local artifact (${(expectedBytecode.length - 2) / 2} bytes)`);
  console.log(`Owner ${owner}`);
  console.log(`Block ${blockNumber}`);
  console.log(`Candidates ${candidateCount} | Jobs ${jobCount} | Matches ${matchCount}`);
  console.log(`Verifier threshold ${verifierThreshold}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
