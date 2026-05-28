"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Radar, RefreshCcw, Send } from "lucide-react";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { Notifications } from "@/components/notifications";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { FlowRail, MetricTile, WorkflowCard } from "@/components/workflow-card";
import type { CandidateRecord, JobRecord, MatchRecord } from "@/lib/contracts/blindhire";
import { decodeMetadata, shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

const actions = [
  {
    href: "/recruiter/jobs",
    icon: Send,
    step: "Step 01",
    title: "Post encrypted job",
    body: "Publish job metadata while salary range and matching thresholds stay encrypted.",
  },
  {
    href: "/recruiter/matching",
    icon: Radar,
    step: "Step 02",
    title: "Compute private match",
    body: "Run encrypted compatibility for a candidate and job pair.",
  },
  {
    href: "/recruiter/decisions",
    icon: Eye,
    step: "Step 03",
    title: "Shortlist and reveal",
    body: "Shortlist candidates and request identity reveal after private evaluation.",
  },
];

export default function RecruiterPage() {
  const chain = useBlindHire();
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [query, setQuery] = useState("");
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

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return candidates;
    return candidates.filter((candidate) => {
      const metadata = decodeMetadata(candidate.anonymousProfileURI);
      return [metadata.alias, metadata.role, metadata.headline, ...(Array.isArray(metadata.skills) ? metadata.skills : [])]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [candidates, query]);

  return (
    <PageShell
      eyebrow="Recruiter Dashboard"
      title="Hire from private, skill-first signals."
      kicker="Recruiter work is split into separate pages: post jobs, compute encrypted matches, then shortlist and request reveal."
    >
      <ChainStatus chain={chain} />

      <FlowRail steps={["Post job", "Review talent", "Compute match", "Request reveal"]} />

      <section className="container grid gap-6 pb-8 md:grid-cols-4">
        <MetricTile label="My jobs" value={myJobs.length.toString()} detail="Jobs posted by the connected wallet." />
        <MetricTile label="Open talent" value={candidates.filter((candidate) => candidate.active).length.toString()} detail="Anonymous active profiles on-chain." />
        <MetricTile label="Matches" value={matches.length.toString()} detail="Encrypted compatibility records." />
        <MetricTile
          label="Reveal requests"
          value={matches.filter((match) => match.revealRequested && !match.revealApproved).length.toString()}
          detail="Waiting for candidate approval."
        />
      </section>

      <section className="container grid gap-6 py-10 md:grid-cols-3">
        {actions.map((action) => (
          <WorkflowCard key={action.href} {...action} />
        ))}
      </section>

      <section className="container pb-8">
        <Field label="Search Anonymous Talent">
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="role, skill, proof signal" />
        </Field>
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
        {filteredCandidates.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No candidate profiles are on-chain yet.</p>
          </LedgerRow>
        ) : (
          filteredCandidates.map((candidate) => {
            const metadata = decodeMetadata(candidate.anonymousProfileURI);
            return (
              <LedgerRow key={candidate.id.toString()}>
                <div>
                  <StateLabel state={candidate.active ? "private" : "pending"}>Candidate #{candidate.id.toString()}</StateLabel>
                  <h3 className="mt-3 font-sentient text-3xl">{String(metadata.role || "Anonymous Talent")}</h3>
                  <p className="mt-2 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
                    {String(metadata.headline || "Encrypted skill profile")}
                  </p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground/40">
                    Owner {shortAddress(candidate.owner)} | Proofs {candidate.verifiedProofs.toString()} verified | Reputation{" "}
                    {candidate.reputationScore.toString()}
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
      <Notifications loadNotifications={chain.loadNotifications} />
    </PageShell>
  );
}
