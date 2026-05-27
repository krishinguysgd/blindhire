"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeErrorResult,
  getAddress,
  http,
  toHex,
  type Address,
  type Chain,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { arbitrumSepolia, baseSepolia, hardhat, sepolia } from "viem/chains";
import { Encryptable, FheTypes, type CofheClient } from "@cofhe/sdk";
import { chains as cofheChains } from "@cofhe/sdk/chains";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import {
  blindHireAbi,
  blindHireErrorMessages,
  configuredChainKey,
  configuredContractAddress,
  type AssessmentRecord,
  type CandidateRecord,
  type EncryptedInput,
  type JobRecord,
  type MatchRecord,
  type MatchRequestRecord,
  type ReputationSignalRecord,
  type SkillProofRecord,
  type VerifierProposalRecord,
} from "@/lib/contracts/blindhire";
import { resolveMetadataValue } from "@/lib/storage";

type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

type EventLogWithArgs = {
  args?: Record<string, unknown>;
  blockNumber?: bigint | null;
  logIndex?: number;
  transactionHash?: Hash;
};

export type BlindHireNotification = {
  id: string;
  label: string;
  detail: string;
  blockNumber?: bigint;
  transactionHash?: Hash;
};

export type RpcHealth = {
  ok: boolean;
  chainId?: number;
  blockNumber?: bigint;
  message: string;
};

declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}

const deploymentBlock = (() => {
  try {
    return BigInt(process.env.NEXT_PUBLIC_BLINDHIRE_DEPLOY_BLOCK || "0");
  } catch {
    return 0n;
  }
})();

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

function rangeFromCount(count: bigint) {
  return Array.from({ length: Number(count) }, (_, index) => BigInt(index + 1));
}

function uniqueSorted(values: bigint[]) {
  return [...new Set(values.map((value) => value.toString()))]
    .map((value) => BigInt(value))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function extractErrorData(error: unknown, depth = 0): Hex | undefined {
  if (!error || depth > 5) return undefined;
  if (typeof error === "string") {
    const match = error.match(/0x[0-9a-fA-F]{8,}/);
    return match?.[0] as Hex | undefined;
  }
  if (typeof error !== "object") return undefined;

  const record = error as Record<string, unknown>;
  for (const key of ["data", "cause", "error", "details", "shortMessage"]) {
    const value = record[key];
    if (typeof value === "string" && value.startsWith("0x")) return value as Hex;
    const nested = extractErrorData(value, depth + 1);
    if (nested) return nested;
  }

  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/0x[0-9a-fA-F]{8,}/);
  return match?.[0] as Hex | undefined;
}

function formatContractError(error: unknown) {
  const data = extractErrorData(error);
  if (data) {
    try {
      const decoded = decodeErrorResult({ abi: blindHireAbi, data });
      return blindHireErrorMessages[decoded.errorName] || decoded.errorName;
    } catch {
      // Fall through to message matching below.
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  for (const [errorName, friendlyMessage] of Object.entries(blindHireErrorMessages)) {
    if (message.includes(errorName)) return friendlyMessage;
  }
  return message.split("\n")[0] || "Transaction failed.";
}

function asAddress(value: unknown) {
  return getAddress(String(value || "0x0000000000000000000000000000000000000000"));
}

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

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;

    const onAccountsChanged = (accounts: unknown) => {
      const nextAccount = Array.isArray(accounts) && accounts[0] ? getAddress(String(accounts[0])) : undefined;
      setAccount(nextAccount);
      if (!nextAccount) setMessage("Wallet disconnected.");
    };
    const onChainChanged = () => {
      setPublicClient(undefined);
      setWalletClient(undefined);
      setCofheClient(undefined);
      setMessage("Network changed. Reconnect to refresh CoFHE permits.");
    };

    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    setError(undefined);
    if (!contractAddress) {
      const reason = "Contract address missing. Deploy and set NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS.";
      setMessage(reason);
      setError(reason);
      return false;
    }

    const provider = window.ethereum;
    if (!provider) {
      setError("No injected wallet found. Install or enable the browser wallet extension.");
      setMessage("Wallet connection failed.");
      return false;
    }

    setConnecting(true);
    try {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHex(selectedChain.viem.id) }],
        });
      } catch (switchError) {
        const code = (switchError as { code?: number }).code;
        if (code !== 4902) throw switchError;

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
      }

      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts[0]) throw new Error("Wallet did not return an account.");
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
      return true;
    } catch (connectError) {
      const reason = formatContractError(connectError);
      setError(reason);
      setMessage("Wallet connection failed.");
      return false;
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
        const reason = formatContractError(writeError);
        setError(reason);
        throw new Error(reason, { cause: writeError });
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

  const loadIdsFromEvents = useCallback(
    async (eventName: string, argName: string, fallbackCounter: "candidateCount" | "jobCount" | "matchCount" | "matchRequestCount") => {
      if (!contractAddress) return [];
      const client = publicClient || readOnlyClient;

      try {
        const logs = (await client.getContractEvents({
          address: contractAddress,
          abi: blindHireAbi,
          eventName: eventName as never,
          fromBlock: deploymentBlock,
          toBlock: "latest",
        })) as EventLogWithArgs[];
        const ids = logs
          .map((log) => log.args?.[argName])
          .filter((value): value is bigint => typeof value === "bigint");
        const uniqueIds = uniqueSorted(ids);
        if (uniqueIds.length > 0) return uniqueIds;

        const count = await readContract<bigint>(fallbackCounter);
        return count > 0n ? rangeFromCount(count) : [];
      } catch {
        const count = await readContract<bigint>(fallbackCounter);
        return rangeFromCount(count);
      }
    },
    [contractAddress, publicClient, readContract, readOnlyClient],
  );

  const loadCandidates = useCallback(async () => {
    const ids = await loadIdsFromEvents("CandidateCreated", "candidateId", "candidateCount");
    const records = await Promise.all(
      ids.map(async (id) => {
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
            boolean,
            bigint,
            bigint,
            bigint,
          ]
        >("getCandidate", [id]);

        if (!result[9]) return undefined;
        const anonymousProfileURI = await resolveMetadataValue(result[1]);
        return {
          id,
          owner: result[0],
          anonymousProfileURI,
          identityCommitment: result[2],
          skillScoreHandle: result[3],
          experienceYearsHandle: result[4],
          salaryMinHandle: result[5],
          salaryMaxHandle: result[6],
          proofCount: result[7],
          verifiedProofs: result[8],
          exists: result[9],
          active: result[10],
          assessmentCount: result[11],
          reputationScore: result[12],
          updatedAt: result[13],
        } satisfies CandidateRecord;
      }),
    );
    return records.filter(Boolean) as CandidateRecord[];
  }, [loadIdsFromEvents, readContract]);

  const loadJobs = useCallback(async () => {
    const ids = await loadIdsFromEvents("JobPosted", "jobId", "jobCount");
    const records = await Promise.all(
      ids.map(async (id) => {
        const result = await readContract<
          [Address, string, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, boolean, boolean, bigint]
        >("getJob", [id]);
        if (!result[7]) return undefined;
        const jobURI = await resolveMetadataValue(result[1]);
        return {
          id,
          recruiter: result[0],
          jobURI,
          requiredSkillScoreHandle: result[2],
          minExperienceYearsHandle: result[3],
          salaryMinHandle: result[4],
          salaryMaxHandle: result[5],
          open: result[6],
          exists: result[7],
          updatedAt: result[8],
        } satisfies JobRecord;
      }),
    );
    return records.filter(Boolean) as JobRecord[];
  }, [loadIdsFromEvents, readContract]);

  const loadMatches = useCallback(async () => {
    const ids = await loadIdsFromEvents("MatchCreated", "matchId", "matchCount");
    const records = await Promise.all(
      ids.map(async (id) => {
        const result = await readContract<
          [bigint, bigint, `0x${string}`, `0x${string}`, `0x${string}`, boolean, boolean, boolean, string, boolean]
        >("getMatch", [id]);
        if (!result[9]) return undefined;

        const audit = await readContract<[Address, `0x${string}`, bigint]>("getMatchAudit", [id]).catch(() => undefined);
        const revealedIdentityURI = result[8] ? await resolveMetadataValue(result[8]) : result[8];
        return {
          id,
          candidateId: result[0],
          jobId: result[1],
          encryptedScoreHandle: result[2],
          salaryOverlapHandle: result[3],
          qualifiedHandle: result[4],
          shortlisted: result[5],
          revealRequested: result[6],
          revealApproved: result[7],
          revealedIdentityURI,
          exists: result[9],
          oracle: audit?.[0],
          oracleReportHash: audit?.[1],
          createdAt: audit?.[2],
        } satisfies MatchRecord;
      }),
    );
    return records.filter(Boolean) as MatchRecord[];
  }, [loadIdsFromEvents, readContract]);

  const loadMatchRequests = useCallback(async () => {
    const ids = await loadIdsFromEvents("MatchRequested", "requestId", "matchRequestCount");
    const records = await Promise.all(
      ids.map(async (id) => {
        const result = await readContract<[bigint, bigint, Address, boolean, bigint, boolean]>("getMatchRequest", [id]);
        if (!result[5]) return undefined;
        return {
          id,
          candidateId: result[0],
          jobId: result[1],
          requester: result[2],
          fulfilled: result[3],
          createdAt: result[4],
          exists: result[5],
        } satisfies MatchRequestRecord;
      }),
    );
    return records.filter(Boolean) as MatchRequestRecord[];
  }, [loadIdsFromEvents, readContract]);

  const loadProofs = useCallback(
    async (candidate: CandidateRecord) => {
      const records: SkillProofRecord[] = [];
      for (let proofIndex = 0n; proofIndex < candidate.proofCount; proofIndex += 1n) {
        const result = await readContract<[string, `0x${string}`, Address, boolean, bigint, bigint]>("getSkillProof", [
          candidate.id,
          proofIndex,
        ]);
        const proofURI = await resolveMetadataValue(result[0]);
        records.push({
          candidateId: candidate.id,
          proofIndex,
          proofURI,
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

  const loadAssessments = useCallback(
    async (candidate: CandidateRecord) => {
      const records: AssessmentRecord[] = [];
      for (let assessmentIndex = 0n; assessmentIndex < candidate.assessmentCount; assessmentIndex += 1n) {
        const result = await readContract<[string, `0x${string}`, Address, boolean, bigint, bigint]>("getAssessment", [
          candidate.id,
          assessmentIndex,
        ]);
        const assessmentURI = await resolveMetadataValue(result[0]);
        records.push({
          candidateId: candidate.id,
          assessmentIndex,
          assessmentURI,
          assessmentHash: result[1],
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

  const loadReputationSignals = useCallback(
    async (candidate: CandidateRecord) => {
      const count = await readContract<bigint>("reputationSignalCount", [candidate.id]);
      const records: ReputationSignalRecord[] = [];
      for (let signalIndex = 0n; signalIndex < count; signalIndex += 1n) {
        const result = await readContract<[string, `0x${string}`, Address, bigint, bigint]>("getReputationSignal", [
          candidate.id,
          signalIndex,
        ]);
        const signalURI = await resolveMetadataValue(result[0]);
        records.push({
          candidateId: candidate.id,
          signalIndex,
          signalURI,
          signalHash: result[1],
          issuer: result[2],
          weight: result[3],
          createdAt: result[4],
        });
      }
      return records;
    },
    [readContract],
  );

  const loadVerifierProposals = useCallback(async () => {
    const count = await readContract<bigint>("verifierProposalCount");
    const records: VerifierProposalRecord[] = [];
    for (let id = 1n; id <= count; id += 1n) {
      const result = await readContract<[Address, Address, bigint, boolean, bigint, boolean]>("getVerifierProposal", [id]);
      if (result[5]) {
        records.push({
          id,
          proposer: result[0],
          verifier: result[1],
          approvals: result[2],
          executed: result[3],
          createdAt: result[4],
          exists: result[5],
        });
      }
    }
    return records;
  }, [readContract]);

  const loadNotifications = useCallback(async () => {
    if (!contractAddress) return [];
    const client = publicClient || readOnlyClient;
    const specs = [
      {
        eventName: "MatchRequested",
        label: "Match requested",
        detail: (args: Record<string, unknown>) =>
          `Candidate #${String(args.candidateId)} requested Job #${String(args.jobId)}.`,
      },
      {
        eventName: "SkillProofAdded",
        label: "Proof awaiting review",
        detail: (args: Record<string, unknown>) =>
          `Candidate #${String(args.candidateId)} added proof #${String(args.proofIndex)}.`,
      },
      {
        eventName: "SkillProofVerified",
        label: "Proof verified",
        detail: (args: Record<string, unknown>) =>
          `Candidate #${String(args.candidateId)} proof #${String(args.proofIndex)} was verified.`,
      },
      {
        eventName: "MatchShortlisted",
        label: "Match shortlisted",
        detail: (args: Record<string, unknown>) => `Match #${String(args.matchId)} was shortlisted.`,
      },
      {
        eventName: "RevealRequested",
        label: "Reveal requested",
        detail: (args: Record<string, unknown>) => `Recruiter requested reveal for match #${String(args.matchId)}.`,
      },
      {
        eventName: "RevealApproved",
        label: "Reveal approved",
        detail: (args: Record<string, unknown>) => `Candidate approved reveal for match #${String(args.matchId)}.`,
      },
      {
        eventName: "AssessmentSubmitted",
        label: "Assessment submitted",
        detail: (args: Record<string, unknown>) =>
          `Candidate #${String(args.candidateId)} submitted assessment #${String(args.assessmentIndex)}.`,
      },
      {
        eventName: "ReputationSignalRecorded",
        label: "Reputation updated",
        detail: (args: Record<string, unknown>) =>
          `Candidate #${String(args.candidateId)} received reputation weight ${String(args.weight)}.`,
      },
    ];

    const groups = await Promise.all(
      specs.map(async (spec) => {
        try {
          const logs = (await client.getContractEvents({
            address: contractAddress,
            abi: blindHireAbi,
            eventName: spec.eventName as never,
            fromBlock: deploymentBlock,
            toBlock: "latest",
          })) as EventLogWithArgs[];
          return logs.map((log, index) => ({
            id: `${spec.eventName}-${log.transactionHash || "nohash"}-${log.logIndex ?? index}`,
            label: spec.label,
            detail: spec.detail(log.args || {}),
            blockNumber: log.blockNumber || undefined,
            transactionHash: log.transactionHash,
          }));
        } catch {
          return [];
        }
      }),
    );

    return groups
      .flat()
      .sort((left, right) => {
        const leftBlock = left.blockNumber || 0n;
        const rightBlock = right.blockNumber || 0n;
        if (leftBlock === rightBlock) return 0;
        return rightBlock > leftBlock ? 1 : -1;
      })
      .slice(0, 12);
  }, [contractAddress, publicClient, readOnlyClient]);

  const getRpcHealth = useCallback(async (): Promise<RpcHealth> => {
    try {
      const client = publicClient || readOnlyClient;
      const [chainId, blockNumber] = await Promise.all([client.getChainId(), client.getBlockNumber()]);
      return {
        ok: chainId === selectedChain.viem.id,
        chainId,
        blockNumber,
        message:
          chainId === selectedChain.viem.id
            ? `RPC healthy at block ${blockNumber.toString()}.`
            : `Wallet is on chain ${chainId}; expected ${selectedChain.viem.id}.`,
      };
    } catch (healthError) {
      return {
        ok: false,
        message: formatContractError(healthError),
      };
    }
  }, [publicClient, readOnlyClient]);

  return {
    account,
    busy,
    connecting,
    contractAddress,
    decryptBool,
    decryptUint32,
    encryptUint32,
    error,
    getRpcHealth,
    loadAssessments,
    loadCandidates,
    loadJobs,
    loadMatchRequests,
    loadMatches,
    loadNotifications,
    loadProofs,
    loadReputationSignals,
    loadVerifierProposals,
    message,
    readContract,
    ready,
    selectedChain,
    writeContract,
    connect,
    asAddress,
  };
}

export type TxReceipt = Awaited<ReturnType<PublicClient["waitForTransactionReceipt"]>>;
export type TxHash = Hash;
