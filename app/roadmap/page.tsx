import Link from "next/link";
import { ArrowRight, GitBranch, LockKeyhole, ShieldCheck, Workflow } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

const milestones = [
  {
    title: "MVP Complete",
    body: "Anonymous profiles, encrypted salary and skill inputs, job posting, verified proofs, private matching, shortlist, reveal request, and reveal approval.",
  },
  {
    title: "Wave 5 Ready",
    body: "Event indexing, job discovery, anonymous assessments, trusted AI/oracle matching, verifier governance, reputation history, decoded errors, and smoke scripts are live.",
  },
  {
    title: "Talent Network",
    body: "Candidate-owned encrypted reputation, anonymous assessments, DAO contributor proofs, and privacy-preserving matching feeds for teams.",
  },
];

export default function RoadmapPage() {
  return (
    <PageShell
      eyebrow="Architecture & Roadmap"
      title="BlindHire is built around selective disclosure."
      kicker="The Wave 5 implementation keeps core state transitions in the BlindHire contract, while CoFHE keeps sensitive matching values encrypted."
    >
      <section className="container grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6 border-y border-border/70 py-8">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-foreground/70">On-Chain Flow</h2>
          {[
            ["Candidate", "Encrypt skill score, experience, and salary expectations before profile creation."],
            ["Recruiter", "Encrypt role thresholds and budget band when posting a job."],
            ["Matcher", "Compute encrypted compatibility, salary overlap, and qualification flag on-chain."],
            ["Assessment", "Anchor anonymous work samples, verifier attestations, reputation signals, and oracle report hashes."],
            ["Reveal", "Recruiter requests identity; candidate approves and writes identity metadata only after consent."],
          ].map(([title, body], index) => (
            <div key={title} className="grid grid-cols-[40px_1fr] gap-4 border-t border-border/70 pt-5 first:border-t-0 first:pt-0">
              <span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="font-sentient text-2xl">{title}</h3>
                <p className="mt-2 font-mono text-sm leading-6 text-foreground/55">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6">
          {milestones.map((item, index) => {
            const Icon = index === 0 ? ShieldCheck : index === 1 ? LockKeyhole : GitBranch;
            return (
              <div key={item.title} className="border-y border-border/70 py-7">
                <div className="mb-4 flex items-center gap-3">
                  <Icon className="size-5 text-primary" />
                  <h3 className="font-mono text-sm uppercase tracking-[0.18em] text-foreground/70">{item.title}</h3>
                </div>
                <p className="font-mono text-sm leading-7 text-foreground/55">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border/80 bg-black/35 py-10 backdrop-blur-md">
        <div className="container flex flex-wrap items-center justify-between gap-5">
          <div>
            <h2 className="font-sentient text-4xl">Run the demo flow</h2>
            <p className="mt-3 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
              Create a candidate, add a proof, verify it, post a job, compute a private match, request reveal, then approve disclosure.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/candidate/profile">
              <Button>
                <Workflow />
                [Candidate]
              </Button>
            </Link>
            <Link href="/recruiter/jobs">
              <Button>
                <ArrowRight />
                [Recruiter]
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
