"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCcw, ShieldCheck } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { Notifications } from "@/components/notifications";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/workflow-card";
import { WorkspacePanel } from "@/components/workspace-panel";
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
  const [query, setQuery] = useState("");
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

  const filteredMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return matches;
    return matches.filter((match) => {
      const candidate = candidatesById.get(match.candidateId.toString());
      const job = jobsById.get(match.jobId.toString());
      const candidateMeta = decodeMetadata(candidate?.anonymousProfileURI || "");
      const jobMeta = decodeMetadata(job?.jobURI || "");
      return [
        match.id.toString(),
        candidateMeta.alias,
        candidateMeta.role,
        candidateMeta.headline,
        jobMeta.company,
        jobMeta.role,
        jobMeta.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [candidatesById, jobsById, matches, query]);

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

      <section className="container grid gap-6 py-8 md:grid-cols-4">
        <MetricTile label="Matches" value={matches.length.toString()} detail="Encrypted compatibility records." />
        <MetricTile label="Revealed" value={matches.filter((match) => match.revealApproved).length.toString()} detail="Identity approved by candidate." />
        <MetricTile label="Pending reveal" value={matches.filter((match) => match.revealRequested && !match.revealApproved).length.toString()} detail="Waiting on candidate approval." />
        <MetricTile label="Decrypted here" value={Object.keys(insights).length.toString()} detail="Local authorized decryptions this session." />
      </section>

      <section className="container py-4">
        <WorkspacePanel eyebrow="Match search" title="Filter match records" body="Search by match ID, anonymous role, company, or alias. Decryption still requires an authorized wallet.">
          <Field label="Search Matches">
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="match id, role, company, alias" />
          </Field>
        </WorkspacePanel>
      </section>

      <Ledger
        title="On-Chain Match Records"
        action={
          <Button type="button" size="sm" variant="secondary" onClick={refresh}>
            <RefreshCcw />
            [Refresh]
          </Button>
        }
      >
        {filteredMatches.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No encrypted matches have been created yet.</p>
          </LedgerRow>
        ) : (
          filteredMatches.map((match) => {
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
                  {match.oracle && match.oracle !== "0x0000000000000000000000000000000000000000" ? (
                    <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground/40">
                      AI oracle {shortAddress(match.oracle)} | Report {match.oracleReportHash?.slice(0, 16)}...
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <Button type="button" size="sm" onClick={() => decryptMatch(match)} disabled={chain.busy}>
                    <ShieldCheck />
                    [Decrypt]
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => requestReveal(match)} disabled={chain.busy || match.revealApproved}>
                    <Eye />
                    [Reveal]
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
