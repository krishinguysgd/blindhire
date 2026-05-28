"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Radar, RefreshCcw } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { StepAside, WorkspacePanel } from "@/components/workspace-panel";
import type { CandidateRecord, JobRecord, MatchRecord, MatchRequestRecord } from "@/lib/contracts/blindhire";
import { asPositiveBigInt, asUint32, decodeMetadata, inputErrorMessage, shortAddress } from "@/lib/metadata";
import { metadataContentHash } from "@/lib/storage";
import { useBlindHire } from "@/lib/use-blindhire";

export default function RecruiterMatchingPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [requests, setRequests] = useState<MatchRequestRecord[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ candidateId: "1", jobId: "1", aiSignal: "", oracleReport: "", useOracle: false });
  const { contractAddress, loadCandidates, loadJobs, loadMatches, loadMatchRequests } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const [nextCandidates, nextJobs, nextMatches, nextRequests] = await Promise.all([
      loadCandidates(),
      loadJobs(),
      loadMatches(),
      loadMatchRequests(),
    ]);
    setCandidates(nextCandidates);
    setJobs(nextJobs);
    setMatches(nextMatches);
    setRequests(nextRequests);
  }, [contractAddress, loadCandidates, loadJobs, loadMatchRequests, loadMatches]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const createMatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Submit again to compute the encrypted match.");
      return;
    }

    let candidateId: bigint;
    let jobId: bigint;
    let aiSignalValue: bigint;
    try {
      candidateId = asPositiveBigInt(form.candidateId, "Candidate ID");
      jobId = asPositiveBigInt(form.jobId, "Job ID");
      aiSignalValue = asUint32(form.aiSignal, "Private AI signal", { max: 100n });
      if (form.useOracle && !form.oracleReport.trim()) throw new Error("Oracle report reference is required when using the oracle route.");
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    const aiSignal = await chain.encryptUint32([aiSignalValue], addLog);
    if (form.useOracle) {
      await chain.writeContract("createMatchWithOracleSignal", [
        candidateId,
        jobId,
        aiSignal[0],
        metadataContentHash(form.oracleReport),
      ]);
    } else {
      await chain.writeContract("createMatch", [candidateId, jobId, aiSignal[0]]);
    }
    addLog(`Encrypted match created for candidate #${form.candidateId} and job #${form.jobId}.`);
    await refresh();
  };

  const decryptMatch = async (record: MatchRecord) => {
    const [score, salaryOverlap, qualified] = await Promise.all([
      chain.decryptUint32(record.encryptedScoreHandle),
      chain.decryptBool(record.salaryOverlapHandle),
      chain.decryptBool(record.qualifiedHandle),
    ]);
    setScores((current) => ({
      ...current,
      [record.id.toString()]: `Score ${score.toString()} | Salary ${salaryOverlap ? "overlaps" : "misses"} | ${
        qualified ? "qualified" : "needs review"
      }`,
    }));
  };

  return (
    <PageShell
      eyebrow="Private Matching"
      title="Compute encrypted compatibility."
      kicker="This page only handles match computation and authorized local decryption of match outputs."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-8 py-10 xl:grid-cols-[minmax(0,0.8fr)_minmax(440px,1.2fr)]">
        <div className="space-y-6">
          <WorkspacePanel
            eyebrow="Match console"
            title="Compute encrypted compatibility"
            body="Load a candidate/job pair from a request or type the IDs directly, then encrypt the AI signal before calling the contract."
          >
            <form onSubmit={createMatch} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Candidate ID">
                  <TextInput value={form.candidateId} onChange={(e) => setForm((current) => ({ ...current, candidateId: e.target.value }))} placeholder="Candidate ID" />
                </Field>
                <Field label="Job ID">
                  <TextInput value={form.jobId} onChange={(e) => setForm((current) => ({ ...current, jobId: e.target.value }))} placeholder="Job ID" />
                </Field>
              </div>
              <Field label="Private AI Signal">
                <TextInput type="number" min="0" max="100" value={form.aiSignal} onChange={(e) => setForm((current) => ({ ...current, aiSignal: e.target.value }))} placeholder="0-100" />
              </Field>
              <label className="flex items-center gap-3 border-y border-border/70 py-4 font-mono text-xs uppercase tracking-[0.16em] text-foreground/55">
                <input
                  type="checkbox"
                  checked={form.useOracle}
                  onChange={(e) => setForm((current) => ({ ...current, useOracle: e.target.checked }))}
                  className="size-4 accent-primary"
                />
                Use trusted oracle route
              </label>
              <Field label="Oracle Report Ref">
                <TextInput value={form.oracleReport} onChange={(e) => setForm((current) => ({ ...current, oracleReport: e.target.value }))} placeholder="Report URI or hash" />
              </Field>
              <Button type="submit" disabled={chain.busy}>
                {form.useOracle ? <Bot /> : <Radar />}
                [Compute Match]
              </Button>
            </form>
          </WorkspacePanel>
          <StepAside
            title="Matching order"
            steps={["Candidate requests a job match.", "Recruiter loads the candidate/job pair.", "AI signal is encrypted locally.", "Contract stores encrypted score, salary overlap, and qualified flag."]}
          />
        </div>

        <Ledger
          title="Anonymous Candidate Ledger"
          action={
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          }
          className="border-t-0"
          contained={false}
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
                    <StateLabel state={candidate.active ? "private" : "pending"}>Candidate #{candidate.id.toString()}</StateLabel>
                    <h3 className="mt-3 font-sentient text-3xl">{String(metadata.role || "Anonymous Talent")}</h3>
                    <p className="mt-2 font-mono text-sm text-foreground/55">
                      Owner {shortAddress(candidate.owner)} | Reputation {candidate.reputationScore.toString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setForm((current) => ({ ...current, candidateId: candidate.id.toString() }))}
                  >
                    [Use]
                  </Button>
                </LedgerRow>
              );
            })
          )}
        </Ledger>
      </section>

      <Ledger title="Candidate Match Requests">
        {requests.filter((request) => !request.fulfilled).length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No open match requests.</p>
          </LedgerRow>
        ) : (
          requests
            .filter((request) => !request.fulfilled)
            .map((request) => {
              const job = jobs.find((item) => item.id === request.jobId);
              const jobMeta = decodeMetadata(job?.jobURI || "");
              return (
                <LedgerRow key={request.id.toString()}>
                  <div>
                    <StateLabel state="pending">Request #{request.id.toString()}</StateLabel>
                    <h3 className="mt-3 font-sentient text-3xl">
                      Candidate #{request.candidateId.toString()} for {String(jobMeta.role || `Job #${request.jobId.toString()}`)}
                    </h3>
                    <p className="mt-2 font-mono text-sm text-foreground/55">Requested by {shortAddress(request.requester)}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        candidateId: request.candidateId.toString(),
                        jobId: request.jobId.toString(),
                      }))
                    }
                  >
                    [Load]
                  </Button>
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
                <p className="mt-2 font-mono text-sm text-foreground/55">
                  {scores[record.id.toString()] || "Encrypted score available to authorized wallets."}
                </p>
                {record.oracle && record.oracle !== "0x0000000000000000000000000000000000000000" ? (
                  <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-foreground/40">
                    Oracle {shortAddress(record.oracle)} | Report {record.oracleReportHash?.slice(0, 16)}...
                  </p>
                ) : null}
              </div>
              <Button type="button" size="sm" onClick={() => decryptMatch(record)} disabled={!chain.ready || chain.busy}>
                [Decrypt Score]
              </Button>
            </LedgerRow>
          ))
        )}
      </Ledger>
    </PageShell>
  );
}
