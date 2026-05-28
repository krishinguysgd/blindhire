"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, UnlockKeyhole } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextArea, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { Notifications } from "@/components/notifications";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { StepAside, WorkspacePanel } from "@/components/workspace-panel";
import type { CandidateRecord, MatchRecord } from "@/lib/contracts/blindhire";
import { asPositiveBigInt, decodeMetadata, inputErrorMessage } from "@/lib/metadata";
import { prepareMetadata } from "@/lib/pinning";
import { identitySalt } from "@/lib/storage";
import { useBlindHire } from "@/lib/use-blindhire";

export default function CandidateRevealPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [form, setForm] = useState({
    matchId: "1",
    name: "",
    email: "",
    location: "",
    portfolio: "",
    identityUri: "",
    identitySecret: "",
    note: "",
  });
  const { account, contractAddress, loadCandidates, loadMatches } = chain;

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

  const candidatesById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id.toString(), candidate])),
    [candidates],
  );

  const revealQueue = useMemo(
    () =>
      matches.filter((match) => {
        const candidate = candidatesById.get(match.candidateId.toString());
        if (account && candidate?.owner.toLowerCase() !== account.toLowerCase()) return false;
        return match.revealRequested || match.revealApproved;
      }),
    [account, candidatesById, matches],
  );

  const approveReveal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Submit again to approve the reveal.");
      return;
    }

    let matchId: bigint;
    try {
      matchId = asPositiveBigInt(form.matchId, "Match ID");
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    const identityURI = await prepareMetadata(
      {
        kind: "identity",
        name: form.name,
        email: form.email,
        location: form.location,
        portfolio: form.portfolio,
        note: form.note,
      },
      { externalUri: form.identityUri, label: "identity metadata", onStatus: addLog },
    );

    await chain.writeContract("approveReveal", [matchId, identityURI, identitySalt(form.identitySecret)]);
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

      <section className="container grid gap-8 py-10 xl:grid-cols-[minmax(0,0.85fr)_minmax(440px,1.15fr)]">
        <div className="space-y-6">
          <WorkspacePanel
            eyebrow="Identity approval"
            title="Reveal only for the selected match"
            body="The identity URI and secret must match the commitment created with the original profile."
          >
            <form onSubmit={approveReveal} className="space-y-6">
              <Field label="Match ID">
                <TextInput value={form.matchId} onChange={(e) => setForm((current) => ({ ...current, matchId: e.target.value }))} placeholder="Match ID" />
              </Field>
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Name">
                  <TextInput value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Name to reveal" />
                </Field>
                <Field label="Email">
                  <TextInput type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="name@company.com" />
                </Field>
                <Field label="Location">
                  <TextInput value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} placeholder="City, country" />
                </Field>
                <Field label="Portfolio">
                  <TextInput value={form.portfolio} onChange={(e) => setForm((current) => ({ ...current, portfolio: e.target.value }))} placeholder="https://..." />
                </Field>
              </div>
              <Field label="Permanent Identity URI">
                <TextInput value={form.identityUri} onChange={(e) => setForm((current) => ({ ...current, identityUri: e.target.value }))} placeholder="ipfs://... or ar://..." />
              </Field>
              <Field label="Identity Commitment Secret">
                <TextInput type="password" value={form.identitySecret} onChange={(e) => setForm((current) => ({ ...current, identitySecret: e.target.value }))} placeholder="Secret used when the profile was created" />
              </Field>
              <Field label="Note">
                <TextArea value={form.note} onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))} placeholder="Optional note for this recruiter." />
              </Field>
              <Button type="submit" disabled={chain.busy}>
                <UnlockKeyhole />
                [Approve Reveal]
              </Button>
            </form>
          </WorkspacePanel>
          <StepAside
            title="Reveal guard"
            steps={["Recruiter requests reveal.", "Candidate selects the match.", "Identity metadata and secret are checked against the commitment.", "Identity URI becomes visible on-chain after approval."]}
          />
        </div>

        <Ledger
          title="Reveal Queue"
          action={
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          }
          className="border-t-0"
          contained={false}
        >
          {revealQueue.length === 0 ? (
            <LedgerRow>
              <p className="font-mono text-sm text-foreground/50">No reveal requests are waiting for this wallet.</p>
            </LedgerRow>
          ) : (
            revealQueue.map((match) => {
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
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setForm((current) => ({ ...current, matchId: match.id.toString() }))}
                    disabled={match.revealApproved}
                  >
                    [Use]
                  </Button>
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
