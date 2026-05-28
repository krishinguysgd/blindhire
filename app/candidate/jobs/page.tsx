"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search, Send } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, SelectInput, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { Notifications } from "@/components/notifications";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { StepAside, WorkspacePanel } from "@/components/workspace-panel";
import type { CandidateRecord, JobRecord, MatchRequestRecord } from "@/lib/contracts/blindhire";
import { asPositiveBigInt, decodeMetadata, inputErrorMessage, shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

export default function CandidateJobsPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [requests, setRequests] = useState<MatchRequestRecord[]>([]);
  const [query, setQuery] = useState("");
  const [candidateId, setCandidateId] = useState("1");
  const { account, contractAddress, loadCandidates, loadJobs, loadMatchRequests } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const [nextCandidates, nextJobs, nextRequests] = await Promise.all([
      loadCandidates(),
      loadJobs(),
      loadMatchRequests(),
    ]);
    setCandidates(nextCandidates);
    setJobs(nextJobs);
    setRequests(nextRequests);
    const owned = account
      ? nextCandidates.find((candidate) => candidate.owner.toLowerCase() === account.toLowerCase() && candidate.active)
      : nextCandidates.find((candidate) => candidate.active);
    if (owned) setCandidateId(owned.id.toString());
  }, [account, contractAddress, loadCandidates, loadJobs, loadMatchRequests]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const myCandidates = useMemo(() => {
    if (!account) return candidates.filter((candidate) => candidate.active);
    return candidates.filter((candidate) => candidate.active && candidate.owner.toLowerCase() === account.toLowerCase());
  }, [account, candidates]);

  const requestedPairs = useMemo(
    () => new Set(requests.map((request) => `${request.candidateId.toString()}-${request.jobId.toString()}`)),
    [requests],
  );

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return jobs
      .filter((job) => job.open)
      .filter((job) => {
        if (!normalized) return true;
        const metadata = decodeMetadata(job.jobURI);
        return [metadata.company, metadata.role, metadata.description, ...(Array.isArray(metadata.requirements) ? metadata.requirements : [])]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      });
  }, [jobs, query]);

  const requestMatch = async (job: JobRecord) => {
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Request the match again to send the transaction.");
      return;
    }

    let parsedCandidateId: bigint;
    try {
      parsedCandidateId = asPositiveBigInt(candidateId, "Candidate ID");
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    await chain.writeContract("requestMatch", [parsedCandidateId, job.id]);
    addLog(`Candidate #${candidateId} requested a private match for job #${job.id.toString()}.`);
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Candidate Job Discovery"
      title="Ask for a match without showing the private numbers."
      kicker="Candidates can search open jobs and request a private match. Recruiters still compute encrypted compatibility on-chain."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-8 py-10 xl:grid-cols-[minmax(0,1fr)_340px]">
        <WorkspacePanel
          eyebrow="Discovery controls"
          title="Find a job, then request a private match"
          body="Pick the candidate profile you want to use. The recruiter computes the encrypted match after your request."
        >
          <div className="grid gap-6 md:grid-cols-[1fr_240px_auto] md:items-end">
            <Field label="Search Open Jobs">
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="role, company, skill" />
            </Field>
            <Field label="Candidate Profile">
              <SelectInput value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>
                {myCandidates.length === 0 ? <option value="1">No active profile</option> : null}
                {myCandidates.map((candidate) => (
                  <option key={candidate.id.toString()} value={candidate.id.toString()}>
                    Candidate #{candidate.id.toString()}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Button type="button" size="sm" variant="secondary" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          </div>
        </WorkspacePanel>
        <StepAside
          title="Match request flow"
          steps={["Create an anonymous profile first.", "Select that profile here.", "Request a private match for an open job.", "Recruiter computes encrypted compatibility next."]}
        />
      </section>

      <Ledger title="Open Job Feed">
        {filteredJobs.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No open jobs match this search.</p>
          </LedgerRow>
        ) : (
          filteredJobs.map((job) => {
            const metadata = decodeMetadata(job.jobURI);
            const alreadyRequested = requestedPairs.has(`${candidateId}-${job.id.toString()}`);
            return (
              <LedgerRow key={job.id.toString()} className="md:grid-cols-[1fr_220px]">
                <div>
                  <StateLabel state="pending">Job #{job.id.toString()}</StateLabel>
                  <h3 className="mt-3 font-sentient text-3xl">{String(metadata.role || "Private Role")}</h3>
                  <p className="mt-2 max-w-3xl font-mono text-sm leading-6 text-foreground/55">
                    {String(metadata.company || "Private company")} | {String(metadata.description || "Encrypted requirements")}
                  </p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground/40">
                    Recruiter {shortAddress(job.recruiter)}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => requestMatch(job)} disabled={chain.busy || alreadyRequested || myCandidates.length === 0}>
                  {alreadyRequested ? <Search /> : <Send />}
                  {alreadyRequested ? "[Requested]" : "[Request Match]"}
                </Button>
              </LedgerRow>
            );
          })
        )}
      </Ledger>
      <Notifications loadNotifications={chain.loadNotifications} />
    </PageShell>
  );
}
