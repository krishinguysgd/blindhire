"use client";

import { useCallback, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  toHex,
  type Address,
  type Chain,
  type Hash,
  type PublicClient,
  type WalletClient,
} from "viem";
import { arbitrumSepolia, baseSepolia, hardhat, sepolia } from "viem/chains";
import { Encryptable, FheTypes, type CofheClient } from "@cofhe/sdk";
import { chains as cofheChains } from "@cofhe/sdk/chains";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import {
  blindHireAbi,
  configuredChainKey,
  configuredContractAddress,
  type CandidateRecord,
  type EncryptedInput,
  type JobRecord,
  type MatchRecord,
  type SkillProofRecord,
} from "@/lib/contracts/blindhire";

type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}

const chainConfigs: Record<
  string,
  {
    label: string;
    viem: Chain;
    cofhe: (typeof cofheChains)[keyof typeof cofheChains];
    rpcUrl: string;
  }
> = {
  "eth-sepolia": {
    label: "Ethereum Sepolia",
    viem: sepolia,
    cofhe: cofheChains.sepolia,
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  },
  "arb-sepolia": {
    label: "Arbitrum Sepolia",
    viem: arbitrumSepolia,
    cofhe: cofheChains.arbSepolia,
    rpcUrl:
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
      "https://sepolia-rollup.arbitrum.io/rpc",
  },
  "base-sepolia": {
    label: "Base Sepolia",
    viem: baseSepolia,
    cofhe: cofheChains.baseSepolia,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
  },
  hardhat: {
    label: "Hardhat",
    viem: hardhat,
    cofhe: cofheChains.hardhat,
    rpcUrl: "http://127.0.0.1:8545",
  },
};

export const selectedChain = chainConfigs[configuredChainKey] || chainConfigs["eth-sepolia"];

export function useBlindHire() {
  const [account, setAccount] = useState<Address>();
  const [publicClient, setPublicClient] = useState<PublicClient>();
  const [walletClient, setWalletClient] = useState<WalletClient>();
  const [cofheClient, setCofheClient] = useState<CofheClient>();
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Connect a wallet to begin.");
  const [error, setError] = useState<string>();

  const readOnlyClient = useMemo(
    () =>
      createPublicClient({
        chain: selectedChain.viem,
        transport: http(selectedChain.rpcUrl),
      }),
    [],
  );

  const contractAddress = configuredContractAddress;
  const ready = Boolean(account && publicClient && walletClient && cofheClient && contractAddress);

  const connect = useCallback(async () => {
    setError(undefined);
    if (!contractAddress) {
      setMessage("Contract address missing. Deploy and set NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS.");
    }

    const provider = window.ethereum;
    if (!provider) {
      setError("No injected wallet found. Install or enable the browser wallet extension.");
      return;
    }

    setConnecting(true);
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHex(selectedChain.viem.id) }],
      });
    } catch (switchError) {
      const code = (switchError as { code?: number }).code;
      if (code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: toHex(selectedChain.viem.id),
              chainName: selectedChain.label,
              nativeCurrency: selectedChain.viem.nativeCurrency,
              rpcUrls: [selectedChain.rpcUrl],
              blockExplorerUrls: selectedChain.viem.blockExplorers?.default
                ? [selectedChain.viem.blockExplorers.default.url]
                : [],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }

    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const activeAccount = getAddress(accounts[0]);
      const transport = custom(provider);
      const nextPublicClient = createPublicClient({
        chain: selectedChain.viem,
        transport,
      });
      const nextWalletClient = createWalletClient({
        account: activeAccount,
        chain: selectedChain.viem,
        transport,
      });
      const cofheConfig = createCofheConfig({
        supportedChains: [selectedChain.cofhe],
        useWorkers: true,
      });
      const nextCofheClient = createCofheClient(cofheConfig);
      await nextCofheClient.connect(nextPublicClient, nextWalletClient);

      setAccount(activeAccount);
      setPublicClient(nextPublicClient);
      setWalletClient(nextWalletClient);
      setCofheClient(nextCofheClient);
      setMessage(`Connected to ${selectedChain.label}.`);
    } catch (connectError) {
      const reason = connectError instanceof Error ? connectError.message : "Wallet connection failed.";
      setError(reason);
    } finally {
      setConnecting(false);
    }
  }, [contractAddress]);

  const readContract = useCallback(
    async <TResult,>(functionName: string, args: readonly unknown[] = []) => {
      if (!contractAddress) throw new Error("Missing BlindHire contract address.");

      return (await (publicClient || readOnlyClient).readContract({
        address: contractAddress,
        abi: blindHireAbi,
        functionName: functionName as never,
        args: args as never,
      })) as TResult;
    },
    [contractAddress, publicClient, readOnlyClient],
  );

  const writeContract = useCallback(
    async (functionName: string, args: readonly unknown[] = []) => {
      if (!ready || !walletClient || !publicClient || !contractAddress) {
        throw new Error("Connect wallet and configure contract before sending transactions.");
      }

      setBusy(true);
      setError(undefined);
      try {
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: blindHireAbi,
          account: account!,
          chain: selectedChain.viem,
          functionName: functionName as never,
          args: args as never,
        });
        setMessage(`Transaction submitted: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        setMessage(`Transaction confirmed in block ${receipt.blockNumber}.`);
        return receipt;
      } catch (writeError) {
        const reason = writeError instanceof Error ? writeError.message : "Transaction failed.";
        setError(reason);
        throw writeError;
      } finally {
        setBusy(false);
      }
    },
    [account, contractAddress, publicClient, ready, walletClient],
  );

  const encryptUint32 = useCallback(
    async (values: bigint[], onProgress?: (step: string) => void) => {
      if (!cofheClient) throw new Error("Connect wallet before encrypting inputs.");
      setBusy(true);
      setError(undefined);
      try {
        const encrypted = await cofheClient
          .encryptInputs(values.map((value) => Encryptable.uint32(value)))
          .onStep((step, ctx) => {
            if (ctx?.isStart) onProgress?.(`Encrypting: ${step}`);
            if (ctx?.isEnd) onProgress?.(`Finished: ${step}`);
          })
          .execute();
        return encrypted as EncryptedInput[];
      } finally {
        setBusy(false);
      }
    },
    [cofheClient],
  );

  const ensurePermit = useCallback(async () => {
    if (!cofheClient) throw new Error("Connect wallet before decrypting values.");
    await cofheClient.permits.getOrCreateSelfPermit();
  }, [cofheClient]);

  const decryptUint32 = useCallback(
    async (handle: `0x${string}`) => {
      if (!cofheClient) throw new Error("Connect wallet before decrypting values.");
      await ensurePermit();
      return (await cofheClient.decryptForView(handle, FheTypes.Uint32).execute()) as bigint;
    },
    [cofheClient, ensurePermit],
  );

  const decryptBool = useCallback(
    async (handle: `0x${string}`) => {
      if (!cofheClient) throw new Error("Connect wallet before decrypting values.");
      await ensurePermit();
      return (await cofheClient.decryptForView(handle, FheTypes.Bool).execute()) as boolean;
    },
    [cofheClient, ensurePermit],
  );

  const loadCandidates = useCallback(async () => {
    const count = await readContract<bigint>("candidateCount");
    const records: CandidateRecord[] = [];
    for (let id = 1n; id <= count; id += 1n) {
      const result = await readContract<
        [
          Address,
          string,
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          bigint,
          bigint,
          boolean,
        ]
      >("getCandidate", [id]);
      if (result[9]) {
        records.push({
          id,
          owner: result[0],
          anonymousProfileURI: result[1],
          identityCommitment: result[2],
          skillScoreHandle: result[3],
          experienceYearsHandle: result[4],
          salaryMinHandle: result[5],
          salaryMaxHandle: result[6],
          proofCount: result[7],
          verifiedProofs: result[8],
          exists: result[9],
        });
      }
    }
    return records;
  }, [readContract]);

  const loadJobs = useCallback(async () => {
    const count = await readContract<bigint>("jobCount");
    const records: JobRecord[] = [];
    for (let id = 1n; id <= count; id += 1n) {
      const result = await readContract<
        [Address, string, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, boolean, boolean]
      >("getJob", [id]);
      if (result[7]) {
        records.push({
          id,
          recruiter: result[0],
          jobURI: result[1],
          requiredSkillScoreHandle: result[2],
          minExperienceYearsHandle: result[3],
          salaryMinHandle: result[4],
          salaryMaxHandle: result[5],
          open: result[6],
          exists: result[7],
        });
      }
    }
    return records;
  }, [readContract]);

  const loadMatches = useCallback(async () => {
    const count = await readContract<bigint>("matchCount");
    const records: MatchRecord[] = [];
    for (let id = 1n; id <= count; id += 1n) {
      const result = await readContract<
        [bigint, bigint, `0x${string}`, `0x${string}`, `0x${string}`, boolean, boolean, boolean, string, boolean]
      >("getMatch", [id]);
      if (result[9]) {
        records.push({
          id,
          candidateId: result[0],
          jobId: result[1],
          encryptedScoreHandle: result[2],
          salaryOverlapHandle: result[3],
          qualifiedHandle: result[4],
          shortlisted: result[5],
          revealRequested: result[6],
          revealApproved: result[7],
          revealedIdentityURI: result[8],
          exists: result[9],
        });
      }
    }
    return records;
  }, [readContract]);

  const loadProofs = useCallback(
    async (candidate: CandidateRecord) => {
      const records: SkillProofRecord[] = [];
      for (let proofIndex = 0n; proofIndex < candidate.proofCount; proofIndex += 1n) {
        const result = await readContract<[string, `0x${string}`, Address, boolean, bigint, bigint]>("getSkillProof", [
          candidate.id,
          proofIndex,
        ]);
        records.push({
          candidateId: candidate.id,
          proofIndex,
          proofURI: result[0],
          proofHash: result[1],
          verifier: result[2],
          verified: result[3],
          createdAt: result[4],
          verifiedAt: result[5],
        });
      }
      return records;
    },
    [readContract],
  );

  return {
    account,
    busy,
    connecting,
    contractAddress,
    decryptBool,
    decryptUint32,
    encryptUint32,
    error,
    loadCandidates,
    loadJobs,
    loadMatches,
    loadProofs,
    message,
    readContract,
    ready,
    selectedChain,
    writeContract,
    connect,
  };
}

export type TxReceipt = Awaited<ReturnType<PublicClient["waitForTransactionReceipt"]>>;
export type TxHash = Hash;
