"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Eye, FileCheck2, RefreshCcw, ShieldCheck, UserRoundPlus } from "lucide-react";
import { ChainStatus } from "@/components/chain-status";
import { FlowRail, MetricTile, WorkflowCard } from "@/components/workflow-card";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { CandidateRecord, JobRecord, MatchRecord } from "@/lib/contracts/blindhire";
import { useBlindHire } from "@/lib/use-blindhire";

const workspaceCards = [
  {
    href: "/candidate",
    icon: UserRoundPlus,
    step: "Role 01",
    title: "Candidate workspace",
    body: "Create an anonymous profile, attach proofs, request matches, and approve identity reveal only after consent.",
    cta: "Enter candidate",
  },
  {
    href: "/recruiter",
    icon: BriefcaseBusiness,
    step: "Role 02",
    title: "Recruiter workspace",
    body: "Post encrypted jobs, compute private compatibility, shortlist talent, and request reveal when ready.",
    cta: "Enter recruiter",
  },
  {
    href: "/verifier",
    icon: ShieldCheck,
    step: "Role 03",
    title: "Verifier desk",
    body: "Attest proofs and assessments, record reputation signals, and manage verifier governance.",
    cta: "Open verifier",
  },
  {
    href: "/matches",
    icon: Eye,
    step: "Room 04",
    title: "Match room",
    body: "Inspect encrypted match records, decrypt authorized outputs, and track reveal status.",
    cta: "Review matches",
  },
];

export default function DashboardPage() {
  const chain = useBlindHire();
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const { account, contractAddress, loadCandidates, loadJobs, loadMatches } = chain;

  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const [nextCandidates, nextJobs, nextMatches] = await Promise.all([loadCandidates(), loadJobs(), loadMatches()]);
    setCandidates(nextCandidates);
    setJobs(nextJobs);
    setMatches(nextMatches);
  }, [contractAddress, loadCandidates, loadJobs, loadMatches]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const myCandidates = useMemo(() => {
    if (!account) return [];
    return candidates.filter((candidate) => candidate.owner.toLowerCase() === account.toLowerCase());
  }, [account, candidates]);

  const myJobs = useMemo(() => {
    if (!account) return [];
    return jobs.filter((job) => job.recruiter.toLowerCase() === account.toLowerCase());
  }, [account, jobs]);

  const revealQueue = matches.filter((match) => match.revealRequested && !match.revealApproved).length;

  return (
    <PageShell
      eyebrow="Workspace Dashboard"
      title="Start with wallet, then choose your role."
      kicker="BlindHire now opens through one operational dashboard: connect, check chain state, then move into the candidate, recruiter, verifier, or match workflow."
    >
      <ChainStatus chain={chain} />

      <FlowRail steps={["Connect wallet", "Choose workspace", "Complete role task", "Track match and reveal"]} />

      <section className="container grid gap-6 pb-8 md:grid-cols-4">
        <MetricTile label="My profiles" value={account ? myCandidates.length.toString() : "—"} detail="Candidate records owned by the connected wallet." />
        <MetricTile label="My jobs" value={account ? myJobs.length.toString() : "—"} detail="Recruiter jobs posted from this wallet." />
        <MetricTile label="Matches" value={matches.length.toString()} detail="Encrypted on-chain compatibility records." />
        <MetricTile label="Reveal queue" value={revealQueue.toString()} detail="Matches waiting on candidate disclosure." />
      </section>

      <section className="container grid gap-6 py-10 lg:grid-cols-4">
        {workspaceCards.map((card) => (
          <WorkflowCard key={card.href} {...card} />
        ))}
      </section>

      <section className="border-y border-border/80 bg-black/35 py-8">
        <div className="container flex flex-wrap items-center justify-between gap-5">
          <div>
            <h2 className="font-sentient text-4xl">Need the cleanest first action?</h2>
            <p className="mt-3 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
              Create a candidate profile first, then use the recruiter flow after the wallet has an on-chain profile to match against.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/candidate/profile">
              <Button size="sm">
                <FileCheck2 />
                [Create Profile]
              </Button>
            </Link>
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
