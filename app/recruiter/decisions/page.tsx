"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, ListChecks, RefreshCcw } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { Notifications } from "@/components/notifications";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { JobRecord, MatchRecord } from "@/lib/contracts/blindhire";
import { asPositiveBigInt, decodeMetadata, inputErrorMessage } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

export default function RecruiterDecisionsPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchId, setMatchId] = useState("1");
  const { account, contractAddress, loadJobs, loadMatches } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const [nextJobs, nextMatches] = await Promise.all([loadJobs(), loadMatches()]);
    setJobs(nextJobs);
    setMatches(nextMatches);
  }, [contractAddress, loadJobs, loadMatches]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const visibleMatches = useMemo(() => {
    if (!account) return matches;
    const myJobIds = new Set(
      jobs
        .filter((job) => job.recruiter.toLowerCase() === account.toLowerCase())
        .map((job) => job.id.toString()),
    );
    return matches.filter((match) => myJobIds.has(match.jobId.toString()));
  }, [account, jobs, matches]);

  const shortlist = async (targetMatchId = matchId) => {
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Click shortlist again to send the transaction.");
      return;
    }
    let parsedMatchId: bigint;
    try {
      parsedMatchId = asPositiveBigInt(targetMatchId, "Match ID");
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    await chain.writeContract("shortlistMatch", [parsedMatchId]);
    addLog(`Match #${targetMatchId} shortlisted.`);
    await refresh();
  };

  const requestReveal = async (targetMatchId = matchId) => {
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Click request reveal again to send the transaction.");
      return;
    }
    let parsedMatchId: bigint;
    try {
      parsedMatchId = asPositiveBigInt(targetMatchId, "Match ID");
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    await chain.writeContract("requestReveal", [parsedMatchId]);
    addLog(`Identity reveal requested for match #${targetMatchId}.`);
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Recruiter Decisions"
      title="Shortlist and request reveal."
      kicker="This page only handles hiring decisions after a private match exists."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-10 py-12 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-6">
          <Field label="Match ID">
            <TextInput value={matchId} onChange={(e) => setMatchId(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Button type="button" onClick={() => shortlist()} disabled={chain.busy}>
              <ListChecks />
              [Shortlist]
            </Button>
            <Button type="button" onClick={() => requestReveal()} disabled={chain.busy}>
              <Eye />
              [Request Reveal]
            </Button>
          </div>
        </div>

        <Ledger
          title="Decision Ledger"
          action={
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          }
          className="border-t-0"
        >
          {visibleMatches.length === 0 ? (
            <LedgerRow>
              <p className="font-mono text-sm text-foreground/50">No matches found for this recruiter wallet.</p>
            </LedgerRow>
          ) : (
            visibleMatches.map((match) => {
              const identity = decodeMetadata(match.revealedIdentityURI);
              return (
                <LedgerRow key={match.id.toString()}>
                  <div>
                    <StateLabel state={match.revealApproved ? "revealed" : match.revealRequested ? "pending" : "private"}>
                      Match #{match.id.toString()}
                    </StateLabel>
                    <h3 className="mt-3 font-sentient text-3xl">
                      Candidate #{match.candidateId.toString()} to Job #{match.jobId.toString()}
                    </h3>
                    <p className="mt-2 font-mono text-sm text-foreground/55">
                      {match.revealApproved
                        ? `Identity revealed: ${String(identity.email || identity.name || "metadata available")}`
                        : match.revealRequested
                          ? "Reveal requested. Waiting for candidate approval."
                          : match.shortlisted
                            ? "Shortlisted. Reveal can be requested."
                            : "Private match awaiting decision."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 md:justify-end">
                    <Button type="button" size="sm" onClick={() => setMatchId(match.id.toString())}>
                      [Use]
                    </Button>
                    <Button type="button" size="sm" onClick={() => shortlist(match.id.toString())} disabled={chain.busy || match.shortlisted || match.revealApproved}>
                      [Shortlist]
                    </Button>
                    <Button type="button" size="sm" onClick={() => requestReveal(match.id.toString())} disabled={chain.busy || match.revealRequested || match.revealApproved}>
                      [Reveal]
                    </Button>
                  </div>
                </LedgerRow>
              );
            })
          )}
        </Ledger>
      </section>
      <Notifications loadNotifications={chain.loadNotifications} />
    </PageShell>
  );
}
