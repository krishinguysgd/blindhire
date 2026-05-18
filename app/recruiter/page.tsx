"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Radar, RefreshCcw, Send } from "lucide-react";
import { ChainStatus } from "@/components/chain-status";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { CandidateRecord, JobRecord, MatchRecord } from "@/lib/contracts/blindhire";
import { decodeMetadata, shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

const actions = [
  {
    href: "/recruiter/jobs",
    icon: Send,
    title: "Post encrypted job",
    body: "Publish job metadata while salary range and matching thresholds stay encrypted.",
  },
  {
    href: "/recruiter/matching",
    icon: Radar,
    title: "Compute private match",
    body: "Run encrypted compatibility for a candidate and job pair.",
  },
  {
    href: "/recruiter/decisions",
    icon: Eye,
    title: "Shortlist and reveal",
    body: "Shortlist candidates and request identity reveal after private evaluation.",
  },
];

export default function RecruiterPage() {
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

  const myJobs = useMemo(() => {
    if (!account) return jobs;
    return jobs.filter((job) => job.recruiter.toLowerCase() === account.toLowerCase());
  }, [account, jobs]);

  return (
    <PageShell
      eyebrow="Recruiter Dashboard"
      title="Hire from private, skill-first signals."
      kicker="Recruiter work is split into separate pages: post jobs, compute encrypted matches, then shortlist and request reveal."
    >
      <ChainStatus chain={chain} />

      <section className="container grid gap-6 py-10 md:grid-cols-3">
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
        title="Anonymous Candidate Ledger"
        action={
          <Button type="button" size="sm" onClick={refresh}>
            <RefreshCcw />
            [Refresh]
          </Button>
        }
      >
        {candidates.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No candidate profiles are on-chain yet.</p>
          </LedgerRow>
        ) : (
          candidates.map((candidate) => {
            const metadata = decodeMetadata(candidate.anonymousProfileURI);
            return (
              <LedgerRow key={candidate.id.toString()}>
                <div>
                  <StateLabel state="private">Candidate #{candidate.id.toString()}</StateLabel>
                  <h3 className="mt-3 font-sentient text-3xl">{String(metadata.role || "Anonymous Talent")}</h3>
                  <p className="mt-2 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
                    {String(metadata.headline || "Encrypted skill profile")}
                  </p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground/40">
                    Owner {shortAddress(candidate.owner)} | Proofs {candidate.verifiedProofs.toString()} verified
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/45">Identity hidden</span>
              </LedgerRow>
            );
          })
        )}
      </Ledger>

      <Ledger title="My Jobs">
        {myJobs.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No jobs found for this wallet yet.</p>
          </LedgerRow>
        ) : (
          myJobs.map((job) => {
            const metadata = decodeMetadata(job.jobURI);
            return (
              <LedgerRow key={job.id.toString()}>
                <div>
                  <StateLabel state={job.open ? "pending" : "verified"}>Job #{job.id.toString()}</StateLabel>
                  <h3 className="mt-3 font-sentient text-3xl">{String(metadata.role || "Private Role")}</h3>
                  <p className="mt-2 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
                    {String(metadata.description || "Encrypted matching requirements")}
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/45">
                  {job.open ? "Open" : "Closed"}
                </span>
              </LedgerRow>
            );
          })
        )}
      </Ledger>

      <Ledger title="Encrypted Matches">
        {matches.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No matches have been computed yet.</p>
          </LedgerRow>
        ) : (
          matches.map((record) => (
            <LedgerRow key={record.id.toString()}>
              <div>
                <StateLabel state={record.revealApproved ? "revealed" : record.revealRequested ? "pending" : "private"}>
                  Match #{record.id.toString()}
                </StateLabel>
                <h3 className="mt-3 font-sentient text-3xl">
                  Candidate #{record.candidateId.toString()} to Job #{record.jobId.toString()}
                </h3>
              </div>
            </LedgerRow>
          ))
        )}
      </Ledger>
    </PageShell>
  );
}
