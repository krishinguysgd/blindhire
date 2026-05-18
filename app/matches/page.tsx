"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCcw, ShieldCheck } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { CandidateRecord, JobRecord, MatchRecord } from "@/lib/contracts/blindhire";
import { decodeMetadata, shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

type MatchInsight = {
  score: bigint;
  salaryOverlap: boolean;
  qualified: boolean;
};

export default function MatchesPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [insights, setInsights] = useState<Record<string, MatchInsight>>({});
  const { contractAddress, loadCandidates, loadJobs, loadMatches } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);

  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const [nextCandidates, nextJobs, nextMatches] = await Promise.all([
      loadCandidates(),
      loadJobs(),
      loadMatches(),
    ]);
    setCandidates(nextCandidates);
    setJobs(nextJobs);
    setMatches(nextMatches);
  }, [contractAddress, loadCandidates, loadJobs, loadMatches]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const candidatesById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id.toString(), candidate])),
    [candidates],
  );
  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id.toString(), job])), [jobs]);

  const decryptMatch = async (match: MatchRecord) => {
    if (!chain.ready) {
      await chain.connect();
      return;
    }

    const [score, salaryOverlap, qualified] = await Promise.all([
      chain.decryptUint32(match.encryptedScoreHandle),
      chain.decryptBool(match.salaryOverlapHandle),
      chain.decryptBool(match.qualifiedHandle),
    ]);
    setInsights((current) => ({
      ...current,
      [match.id.toString()]: { score, salaryOverlap, qualified },
    }));
    addLog(`Match #${match.id.toString()} decrypted locally through CoFHE permit.`);
  };

  const requestReveal = async (match: MatchRecord) => {
    if (!chain.ready) {
      await chain.connect();
      return;
    }

    await chain.writeContract("requestReveal", [match.id]);
    addLog(`Reveal requested for match #${match.id.toString()}.`);
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Private Match Room"
      title="Inspect encrypted compatibility without identity leakage."
      kicker="Every match row is backed by an on-chain record. The score, salary overlap, and qualified flag stay encrypted until an authorized wallet decrypts them locally."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <Ledger
        title="On-Chain Match Records"
        action={
          <Button type="button" size="sm" onClick={refresh}>
            <RefreshCcw />
            [Refresh]
          </Button>
        }
      >
        {matches.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No encrypted matches have been created yet.</p>
          </LedgerRow>
        ) : (
          matches.map((match) => {
            const candidate = candidatesById.get(match.candidateId.toString());
            const job = jobsById.get(match.jobId.toString());
            const candidateMeta = decodeMetadata(candidate?.anonymousProfileURI || "");
            const jobMeta = decodeMetadata(job?.jobURI || "");
            const insight = insights[match.id.toString()];
            const identityMeta = decodeMetadata(match.revealedIdentityURI);

            return (
              <LedgerRow key={match.id.toString()} className="md:grid-cols-[1fr_260px]">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <StateLabel state={match.revealApproved ? "revealed" : match.revealRequested ? "pending" : "private"}>
                      Match #{match.id.toString()}
                    </StateLabel>
                    <span className="font-mono text-xs text-foreground/40">
                      Candidate #{match.candidateId.toString()} | Job #{match.jobId.toString()}
                    </span>
                  </div>
                  <h3 className="font-sentient text-3xl">
                    {String(candidateMeta.role || "Anonymous Talent")} for {String(jobMeta.role || "Private Role")}
                  </h3>
                  <p className="mt-2 max-w-3xl font-mono text-sm leading-6 text-foreground/55">
                    {String(candidateMeta.headline || "Encrypted candidate profile")} | Recruiter{" "}
                    {shortAddress(job?.recruiter)}
                  </p>
                  {insight ? (
                    <p className="mt-4 font-mono text-sm text-primary">
                      Score {insight.score.toString()} | Salary {insight.salaryOverlap ? "overlaps" : "does not overlap"} |{" "}
                      {insight.qualified ? "Qualified" : "Needs review"}
                    </p>
                  ) : (
                    <p className="mt-4 font-mono text-sm text-foreground/40">
                      Encrypted score handle {match.encryptedScoreHandle.slice(0, 14)}...
                    </p>
                  )}
                  {match.revealApproved ? (
                    <p className="mt-4 font-mono text-sm leading-6 text-foreground/70">
                      Revealed identity: {String(identityMeta.name || "Candidate")} | {String(identityMeta.email || "No email")} |{" "}
                      {String(identityMeta.portfolio || "No portfolio")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <Button type="button" size="sm" onClick={() => decryptMatch(match)} disabled={chain.busy}>
                    <ShieldCheck />
                    [Decrypt]
                  </Button>
                  <Button type="button" size="sm" onClick={() => requestReveal(match)} disabled={chain.busy || match.revealApproved}>
                    <Eye />
                    [Reveal]
                  </Button>
                </div>
              </LedgerRow>
            );
          })
        )}
      </Ledger>
    </PageShell>
  );
}
