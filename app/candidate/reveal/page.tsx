"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, UnlockKeyhole } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextArea, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { MatchRecord } from "@/lib/contracts/blindhire";
import { decodeMetadata, encodeMetadata } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

export default function CandidateRevealPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [form, setForm] = useState({
    matchId: "1",
    name: "Rahul Sharma",
    email: "rahul@example.com",
    location: "Bengaluru, India",
    portfolio: "https://portfolio.example.com",
    note: "Open to senior protocol frontend roles.",
  });
  const { contractAddress, loadMatches } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    setMatches(await loadMatches());
  }, [contractAddress, loadMatches]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const approveReveal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      addLog("Wallet connected. Submit again to approve the reveal.");
      return;
    }

    await chain.writeContract("approveReveal", [
      BigInt(form.matchId),
      encodeMetadata({
        kind: "identity",
        name: form.name,
        email: form.email,
        location: form.location,
        portfolio: form.portfolio,
        note: form.note,
      }),
    ]);
    addLog(`Identity reveal approved for match #${form.matchId}.`);
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Selective Reveal"
      title="Approve identity only after a recruiter asks."
      kicker="This page only handles reveal approval. It writes identity metadata after the match has a recruiter reveal request."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={approveReveal} className="space-y-6">
          <Field label="Match ID">
            <TextInput value={form.matchId} onChange={(e) => setForm((current) => ({ ...current, matchId: e.target.value }))} />
          </Field>
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <TextInput value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
          </Field>
          <Field label="Location">
            <TextInput value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} />
          </Field>
          <Field label="Portfolio">
            <TextInput value={form.portfolio} onChange={(e) => setForm((current) => ({ ...current, portfolio: e.target.value }))} />
          </Field>
          <Field label="Note">
            <TextArea value={form.note} onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={chain.busy}>
            <UnlockKeyhole />
            [Approve Reveal]
          </Button>
        </form>

        <Ledger
          title="Reveal Queue"
          action={
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          }
          className="border-t-0"
        >
          {matches.length === 0 ? (
            <LedgerRow>
              <p className="font-mono text-sm text-foreground/50">No matches are on-chain yet.</p>
            </LedgerRow>
          ) : (
            matches.map((match) => {
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
                        ? `Revealed to recruiter: ${String(identity.email || identity.name || "identity metadata")}`
                        : match.revealRequested
                          ? "Recruiter requested identity. Candidate can approve."
                          : "Identity is still sealed."}
                    </p>
                  </div>
                </LedgerRow>
              );
            })
          )}
        </Ledger>
      </section>
    </PageShell>
  );
}
