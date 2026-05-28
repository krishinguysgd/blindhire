'use client'

import { useCallback, useEffect, useState } from "react";
import { Hero } from "@/components/hero";
import { Leva } from "leva";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  FileCheck2,
  LayoutDashboard,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  UserRoundSearch,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricTile, WorkflowCard } from "@/components/workflow-card";
import { shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

const privacySteps = [
  {
    title: "Candidate profile",
    body: "The candidate writes anonymous metadata and encrypts skill score, years, and salary range in the browser.",
  },
  {
    title: "Skill evidence",
    body: "Proofs, assessments, and reputation signals are anchored on-chain without exposing the candidate identity.",
  },
  {
    title: "Recruiter job",
    body: "The recruiter posts a public brief while role thresholds and budget are encrypted before the transaction.",
  },
  {
    title: "Private match",
    body: "The contract stores encrypted compatibility outputs and reveal status for the candidate/job pair.",
  },
  {
    title: "Selective reveal",
    body: "Recruiters can request identity, but the candidate approves disclosure for a specific match only.",
  },
];

const entryCards = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    step: "Start",
    title: "Dashboard",
    body: "Connect wallet, check chain status, and choose the correct workspace before sending transactions.",
    cta: "Open dashboard",
  },
  {
    href: "/candidate/profile",
    icon: UserRoundSearch,
    step: "Candidate",
    title: "Create profile",
    body: "Build a skill-first profile, encrypt private matching values, and commit identity for later reveal.",
    cta: "Create profile",
  },
  {
    href: "/recruiter/jobs",
    icon: BriefcaseBusiness,
    step: "Recruiter",
    title: "Post job",
    body: "Publish the role brief and encrypt thresholds so candidates can match without seeing sensitive budget data.",
    cta: "Post job",
  },
  {
    href: "/verifier",
    icon: BadgeCheck,
    step: "Verifier",
    title: "Verify evidence",
    body: "Review candidate proofs and assessments, then write attestations and reputation signals on-chain.",
    cta: "Open verifier",
  },
];

export default function Home() {
  const chain = useBlindHire();
  const [counts, setCounts] = useState({
    candidates: "—",
    jobs: "—",
    matches: "—",
    requests: "—",
  });
  const [status, setStatus] = useState("Reading deployed contract state.");
  const { contractAddress, loadCandidates, loadJobs, loadMatches, loadMatchRequests } = chain;

  const refreshCounts = useCallback(async () => {
    if (!contractAddress) {
      setStatus("Contract address is not configured.");
      return;
    }

    setStatus("Reading deployed contract state.");
    try {
      const [candidates, jobs, matches, requests] = await Promise.all([
        loadCandidates(),
        loadJobs(),
        loadMatches(),
        loadMatchRequests(),
      ]);
      setCounts({
        candidates: candidates.length.toString(),
        jobs: jobs.length.toString(),
        matches: matches.length.toString(),
        requests: requests.filter((request) => !request.fulfilled).length.toString(),
      });
      setStatus("Live contract state loaded.");
    } catch {
      setStatus("Could not read contract state from the current RPC.");
    }
  }, [contractAddress, loadCandidates, loadJobs, loadMatches, loadMatchRequests]);

  useEffect(() => {
    refreshCounts().catch(() => undefined);
  }, [refreshCounts]);

  return (
    <>
      <Hero />
      <Leva hidden />
      <main className="relative z-10 border-t border-border/80 bg-black/95">
        <section className="container grid gap-6 py-10 md:grid-cols-4">
          <MetricTile label="Candidates" value={counts.candidates} detail="Anonymous profiles currently readable from the contract." />
          <MetricTile label="Jobs" value={counts.jobs} detail="Encrypted job records posted on the selected chain." />
          <MetricTile label="Matches" value={counts.matches} detail="Compatibility records created through the matching flow." />
          <MetricTile label="Open requests" value={counts.requests} detail="Candidate match requests waiting for recruiter action." />
        </section>

        <section className="border-y border-border/80 bg-surface/95">
          <div className="container grid gap-10 py-12 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Production flow</p>
              <h2 className="mt-4 max-w-3xl overflow-wrap-anywhere font-sentient text-4xl leading-none md:text-5xl">
                One wallet entry, then the right on-chain workspace.
              </h2>
              <p className="mt-5 max-w-2xl font-mono text-sm leading-7 text-foreground/58">
                BlindHire separates the product into four real workspaces: candidate, recruiter, verifier, and match room.
                Start from the dashboard so chain status, wallet role, and live records are visible before each action.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button>
                    <LayoutDashboard />
                    [Open Dashboard]
                  </Button>
                </Link>
                <Button type="button" variant="secondary" onClick={refreshCounts}>
                  <RefreshCcw />
                  [Refresh Chain]
                </Button>
              </div>
              <p className="mt-5 font-mono text-xs leading-5 text-foreground/45">
                {status} Contract {shortAddress(contractAddress)} on {chain.selectedChain.label}.
              </p>
            </div>

            <div className="grid gap-4">
              {privacySteps.map((step, index) => (
                <div key={step.title} className="grid grid-cols-[36px_1fr] gap-4 border-t border-border/70 pt-4 first:border-t-0 first:pt-0">
                  <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-sentient text-2xl">{step.title}</h3>
                    <p className="mt-2 font-mono text-sm leading-6 text-foreground/55">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container grid gap-6 py-12 lg:grid-cols-4">
          {entryCards.map((card) => (
            <WorkflowCard key={card.href} {...card} />
          ))}
        </section>

        <section className="border-y border-border/80 py-10">
          <div className="container grid gap-8 md:grid-cols-3">
            {[
              {
                icon: LockKeyhole,
                title: "Encrypted inputs stay local first",
                body: "Sensitive score, experience, salary, budget, and AI signal values are encrypted before contract calls.",
              },
              {
                icon: FileCheck2,
                title: "Proofs are reviewable without identity",
                body: "Verifiers can attest proof records and assessments while candidate names remain sealed.",
              },
              {
                icon: ShieldCheck,
                title: "Reveal is a consented transaction",
                body: "Identity appears only after a recruiter reveal request and a candidate approval transaction.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="border-y border-border/70 py-7">
                  <Icon className="mb-5 size-6 text-primary" />
                  <h2 className="font-sentient text-3xl">{item.title}</h2>
                  <p className="mt-4 font-mono text-sm leading-7 text-foreground/55">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-b border-border/80 bg-surface/95 py-10">
          <div className="container flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="font-sentient text-4xl">Ready for the next action?</h2>
              <p className="mt-3 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
                Use the dashboard as the control room, or inspect the full architecture flow before sending transactions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button>
                  <Workflow />
                  [Dashboard]
                </Button>
              </Link>
              <Link href="/roadmap">
                <Button variant="secondary">
                  <ArrowRight />
                  [View Flow]
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
