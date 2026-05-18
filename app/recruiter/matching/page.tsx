"use client";

import { useCallback, useEffect, useState } from "react";
import { Radar, RefreshCcw } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { CandidateRecord, MatchRecord } from "@/lib/contracts/blindhire";
import { asUint32, decodeMetadata, shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

export default function RecruiterMatchingPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ candidateId: "1", jobId: "1", aiSignal: "94" });
  const { contractAddress, loadCandidates, loadMatches } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const [nextCandidates, nextMatches] = await Promise.all([loadCandidates(), loadMatches()]);
    setCandidates(nextCandidates);
    setMatches(nextMatches);
  }, [contractAddress, loadCandidates, loadMatches]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const createMatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      addLog("Wallet connected. Submit again to compute the encrypted match.");
      return;
    }

    const aiSignal = await chain.encryptUint32([asUint32(form.aiSignal)], addLog);
    await chain.writeContract("createMatch", [BigInt(form.candidateId), BigInt(form.jobId), aiSignal[0]]);
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

      <section className="container grid gap-10 py-12 lg:grid-cols-[0.75fr_1.25fr]">
        <form onSubmit={createMatch} className="space-y-6">
          <Field label="Candidate ID">
            <TextInput value={form.candidateId} onChange={(e) => setForm((current) => ({ ...current, candidateId: e.target.value }))} />
          </Field>
          <Field label="Job ID">
            <TextInput value={form.jobId} onChange={(e) => setForm((current) => ({ ...current, jobId: e.target.value }))} />
          </Field>
          <Field label="Private AI Signal">
            <TextInput type="number" min="0" max="100" value={form.aiSignal} onChange={(e) => setForm((current) => ({ ...current, aiSignal: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={chain.busy}>
            <Radar />
            [Compute Match]
          </Button>
        </form>

        <Ledger
          title="Anonymous Candidate Ledger"
          action={
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          }
          className="border-t-0"
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
                    <p className="mt-2 font-mono text-sm text-foreground/55">Owner {shortAddress(candidate.owner)}</p>
                  </div>
                </LedgerRow>
              );
            })
          )}
        </Ledger>
      </section>

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
