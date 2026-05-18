"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, RefreshCcw, ShieldPlus } from "lucide-react";
import { isAddress, type Address } from "viem";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { CandidateRecord, SkillProofRecord } from "@/lib/contracts/blindhire";
import { decodeMetadata, shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

export default function VerifierPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [proofs, setProofs] = useState<SkillProofRecord[]>([]);
  const [verifyForm, setVerifyForm] = useState({ candidateId: "1", proofIndex: "0" });
  const [verifierForm, setVerifierForm] = useState({ verifier: "" });
  const [owner, setOwner] = useState<Address>();
  const { contractAddress, loadCandidates, loadProofs, readContract } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);

  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const [nextCandidates, nextOwner] = await Promise.all([
      loadCandidates(),
      readContract<Address>("owner"),
    ]);
    const nextProofs = (
      await Promise.all(nextCandidates.map((candidate) => loadProofs(candidate)))
    ).flat();
    setCandidates(nextCandidates);
    setProofs(nextProofs);
    setOwner(nextOwner);
  }, [contractAddress, loadCandidates, loadProofs, readContract]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const verifyProof = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      return;
    }

    await chain.writeContract("verifySkillProof", [
      BigInt(verifyForm.candidateId),
      BigInt(verifyForm.proofIndex),
    ]);
    addLog(`Proof #${verifyForm.proofIndex} verified for candidate #${verifyForm.candidateId}.`);
    await refresh();
  };

  const setVerifier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      return;
    }
    if (!isAddress(verifierForm.verifier)) {
      addLog("Verifier address is invalid.");
      return;
    }

    await chain.writeContract("setVerifier", [verifierForm.verifier, true]);
    addLog(`Trusted verifier added: ${shortAddress(verifierForm.verifier)}.`);
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Verifier Desk"
      title="Verify proof without exposing the whole resume."
      kicker="Trusted verifiers attest to proofs on-chain. Candidates build reputation through verified work while keeping sensitive profile fields encrypted."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-10 py-12 lg:grid-cols-2">
        <form onSubmit={verifyProof} className="space-y-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-foreground/70">Verify Candidate Proof</h2>
          <Field label="Candidate ID">
            <TextInput value={verifyForm.candidateId} onChange={(e) => setVerifyForm((current) => ({ ...current, candidateId: e.target.value }))} />
          </Field>
          <Field label="Proof Index">
            <TextInput value={verifyForm.proofIndex} onChange={(e) => setVerifyForm((current) => ({ ...current, proofIndex: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={chain.busy}>
            <BadgeCheck />
            [Verify Proof]
          </Button>
        </form>

        <form onSubmit={setVerifier} className="space-y-6 border-t border-border/70 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-foreground/70">Owner Verifier Registry</h2>
          <p className="font-mono text-sm leading-6 text-foreground/55">
            Contract owner: {shortAddress(owner)}. Only this account can add a trusted verifier.
          </p>
          <Field label="Verifier Address">
            <TextInput value={verifierForm.verifier} onChange={(e) => setVerifierForm({ verifier: e.target.value })} placeholder="0x..." />
          </Field>
          <Button type="submit" disabled={chain.busy}>
            <ShieldPlus />
            [Add Trusted Verifier]
          </Button>
        </form>
      </section>

      <Ledger
        title="Proof Ledger"
        action={
          <Button type="button" size="sm" onClick={refresh}>
            <RefreshCcw />
            [Refresh]
          </Button>
        }
      >
        {proofs.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No skill proofs are on-chain yet.</p>
          </LedgerRow>
        ) : (
          proofs.map((proof) => {
            const metadata = decodeMetadata(proof.proofURI);
            return (
              <LedgerRow key={`${proof.candidateId.toString()}-${proof.proofIndex.toString()}`}>
                <div>
                  <StateLabel state={proof.verified ? "verified" : "pending"}>
                    Candidate #{proof.candidateId.toString()} Proof #{proof.proofIndex.toString()}
                  </StateLabel>
                  <h3 className="mt-3 font-sentient text-3xl">{String(metadata.title || "Skill proof")}</h3>
                  <p className="mt-2 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
                    {String(metadata.notes || metadata.link || "Proof metadata stored on-chain.")}
                  </p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground/40">
                    Hash {proof.proofHash.slice(0, 16)}... | Verifier {shortAddress(proof.verifier)}
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/45">
                  {proof.verified ? "Verified" : "Waiting"}
                </span>
              </LedgerRow>
            );
          })
        )}
      </Ledger>

      <Ledger title="Candidate Reputation">
        {candidates.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No candidates yet.</p>
          </LedgerRow>
        ) : (
          candidates.map((candidate) => {
            const metadata = decodeMetadata(candidate.anonymousProfileURI);
            return (
              <LedgerRow key={candidate.id.toString()}>
                <div>
                  <StateLabel state={candidate.verifiedProofs > 0n ? "verified" : "pending"}>
                    Candidate #{candidate.id.toString()}
                  </StateLabel>
                  <h3 className="mt-3 font-sentient text-3xl">{String(metadata.role || "Anonymous Talent")}</h3>
                  <p className="mt-2 font-mono text-sm text-foreground/55">
                    {candidate.verifiedProofs.toString()} verified proofs from {candidate.proofCount.toString()} total submissions.
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/45">Identity sealed</span>
              </LedgerRow>
            );
          })
        )}
      </Ledger>
    </PageShell>
  );
}
