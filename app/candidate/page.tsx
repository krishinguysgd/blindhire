"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, ClipboardCheck, FileCheck2, RefreshCcw, Send, Trash2, UnlockKeyhole } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { Notifications } from "@/components/notifications";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { CandidateRecord } from "@/lib/contracts/blindhire";
import { decodeMetadata, formatSalary, shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

type DecryptedCandidate = {
  skill: bigint;
  experience: bigint;
  salaryMin: bigint;
  salaryMax: bigint;
};

const actions = [
  {
    href: "/candidate/profile",
    icon: Send,
    title: "Create anonymous profile",
    body: "Encrypt skills, experience, and salary band before writing the profile on-chain.",
  },
  {
    href: "/candidate/proofs",
    icon: FileCheck2,
    title: "Upload skill proof",
    body: "Attach proof metadata and hashes to a candidate profile for verifier review.",
  },
  {
    href: "/candidate/assessments",
    icon: ClipboardCheck,
    title: "Submit assessment",
    body: "Attach anonymous coding tests, work samples, or interview scores for verifier review.",
  },
  {
    href: "/candidate/jobs",
    icon: BriefcaseBusiness,
    title: "Discover jobs",
    body: "Search open jobs and request a private match without exposing raw encrypted values.",
  },
  {
    href: "/candidate/reveal",
    icon: UnlockKeyhole,
    title: "Approve identity reveal",
    body: "Release identity only for a recruiter match that requested disclosure.",
  },
];

export default function CandidatePage() {
  const chain = useBlindHire();
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [decrypted, setDecrypted] = useState<Record<string, DecryptedCandidate>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const { account, contractAddress, loadCandidates } = chain;
  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);

  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    setCandidates(await loadCandidates());
  }, [contractAddress, loadCandidates]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const myCandidates = useMemo(() => {
    if (!account) return candidates;
    return candidates.filter((candidate) => candidate.owner.toLowerCase() === account.toLowerCase());
  }, [account, candidates]);

  const decryptCandidate = async (candidate: CandidateRecord) => {
    const [skill, experience, salaryMin, salaryMax] = await Promise.all([
      chain.decryptUint32(candidate.skillScoreHandle),
      chain.decryptUint32(candidate.experienceYearsHandle),
      chain.decryptUint32(candidate.salaryMinHandle),
      chain.decryptUint32(candidate.salaryMaxHandle),
    ]);

    setDecrypted((current) => ({
      ...current,
      [candidate.id.toString()]: { skill, experience, salaryMin, salaryMax },
    }));
  };

  const deactivateCandidate = async (candidate: CandidateRecord) => {
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Click archive again to send the transaction.");
      return;
    }

    await chain.writeContract("deactivateCandidate", [candidate.id]);
    addLog(`Candidate #${candidate.id.toString()} archived on-chain. Public history remains visible.`);
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Candidate Dashboard"
      title="Manage your private hiring profile."
      kicker="Candidate work is split into separate flows: create your anonymous profile, upload proofs, then approve identity reveal only when you choose."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-6 py-10 md:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="group border-y border-border/70 py-6">
              <Icon className="mb-5 size-5 text-primary" />
              <h2 className="font-sentient text-3xl">{action.title}</h2>
              <p className="mt-3 font-mono text-sm leading-6 text-foreground/55">{action.body}</p>
              <span className="mt-5 inline-block font-mono text-xs uppercase tracking-[0.18em] text-primary group-hover:text-primary/80">
                Open flow
              </span>
            </Link>
          );
        })}
      </section>

      <Ledger
        title="My On-Chain Profiles"
        action={
          <Button type="button" size="sm" onClick={refresh}>
            <RefreshCcw />
            [Refresh]
          </Button>
        }
      >
        {myCandidates.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No candidate profiles found for this wallet yet.</p>
          </LedgerRow>
        ) : (
          myCandidates.map((candidate) => {
            const metadata = decodeMetadata(candidate.anonymousProfileURI);
            const privateValues = decrypted[candidate.id.toString()];
            return (
              <LedgerRow key={candidate.id.toString()}>
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <StateLabel state={candidate.active ? "private" : "pending"}>Candidate #{candidate.id.toString()}</StateLabel>
                    <span className="font-mono text-xs text-foreground/40">{shortAddress(candidate.owner)}</span>
                  </div>
                  <h3 className="font-sentient text-3xl">{String(metadata.role || "Anonymous Talent")}</h3>
                  <p className="mt-2 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
                    {String(metadata.headline || "Skill-first profile stored on-chain.")}
                  </p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground/40">
                    Proofs {candidate.verifiedProofs.toString()} verified / {candidate.proofCount.toString()} total
                    {" | "}Assessments {candidate.assessmentCount.toString()} | Reputation {candidate.reputationScore.toString()}
                  </p>
                  {privateValues ? (
                    <p className="mt-3 font-mono text-sm text-primary">
                      Skill {privateValues.skill.toString()} | {privateValues.experience.toString()} years |{" "}
                      {formatSalary(privateValues.salaryMin)} - {formatSalary(privateValues.salaryMax)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3 md:justify-end">
                  <Button type="button" size="sm" onClick={() => decryptCandidate(candidate)} disabled={!chain.ready || chain.busy}>
                    [Decrypt Mine]
                  </Button>
                  <Button type="button" size="sm" onClick={() => deactivateCandidate(candidate)} disabled={chain.busy || !candidate.active}>
                    <Trash2 />
                    [Archive]
                  </Button>
                </div>
              </LedgerRow>
            );
          })
        )}
      </Ledger>
      <Notifications loadNotifications={chain.loadNotifications} />
    </PageShell>
  );
}
