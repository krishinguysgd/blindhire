"use client";

import { useCallback, useEffect, useState } from "react";
import { FileCheck2, RefreshCcw } from "lucide-react";
import { keccak256, toBytes } from "viem";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextArea, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { SkillProofRecord } from "@/lib/contracts/blindhire";
import { decodeMetadata, encodeMetadata, shortAddress } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

export default function CandidateProofsPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [proofs, setProofs] = useState<SkillProofRecord[]>([]);
  const [form, setForm] = useState({
    candidateId: "1",
    title: "GitHub ownership and shipped protocol UI",
    issuer: "BlindHire verifier desk",
    link: "https://github.com/example/protocol-ui",
    notes: "Repository ownership, shipped work, and audit trail verified.",
  });
  const { contractAddress, loadCandidates, loadProofs } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const nextCandidates = await loadCandidates();
    setProofs((await Promise.all(nextCandidates.map((candidate) => loadProofs(candidate)))).flat());
  }, [contractAddress, loadCandidates, loadProofs]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const addProof = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      addLog("Wallet connected. Submit again to add the proof on-chain.");
      return;
    }

    const proofURI = encodeMetadata({
      kind: "skill-proof",
      title: form.title,
      issuer: form.issuer,
      link: form.link,
      notes: form.notes,
    });

    await chain.writeContract("addSkillProof", [BigInt(form.candidateId), proofURI, keccak256(toBytes(proofURI))]);
    addLog(`Skill proof added for candidate #${form.candidateId}.`);
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Skill Proofs"
      title="Attach proof without revealing identity."
      kicker="This page only handles candidate proof uploads. Verifiers review these proofs from their own desk."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={addProof} className="space-y-6">
          <Field label="Candidate ID">
            <TextInput value={form.candidateId} onChange={(e) => setForm((current) => ({ ...current, candidateId: e.target.value }))} />
          </Field>
          <Field label="Proof Title">
            <TextInput value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} />
          </Field>
          <Field label="Issuer">
            <TextInput value={form.issuer} onChange={(e) => setForm((current) => ({ ...current, issuer: e.target.value }))} />
          </Field>
          <Field label="Proof Link">
            <TextInput value={form.link} onChange={(e) => setForm((current) => ({ ...current, link: e.target.value }))} />
          </Field>
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={chain.busy}>
            <FileCheck2 />
            [Add Proof]
          </Button>
        </form>

        <Ledger
          title="Candidate Proof Ledger"
          action={
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          }
          className="border-t-0"
        >
          {proofs.length === 0 ? (
            <LedgerRow>
              <p className="font-mono text-sm text-foreground/50">No proofs are on-chain yet.</p>
            </LedgerRow>
          ) : (
            proofs.map((proof) => {
              const metadata = decodeMetadata(proof.proofURI);
              return (
                <LedgerRow key={`${proof.candidateId}-${proof.proofIndex}`}>
                  <div>
                    <StateLabel state={proof.verified ? "verified" : "pending"}>
                      Candidate #{proof.candidateId.toString()} Proof #{proof.proofIndex.toString()}
                    </StateLabel>
                    <h3 className="mt-3 font-sentient text-3xl">{String(metadata.title || "Skill proof")}</h3>
                    <p className="mt-2 font-mono text-sm text-foreground/55">
                      Verifier {shortAddress(proof.verifier)} | Hash {proof.proofHash.slice(0, 16)}...
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
