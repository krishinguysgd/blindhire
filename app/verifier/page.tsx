"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ClipboardCheck, RefreshCcw, ShieldPlus, Sparkles } from "lucide-react";
import { isAddress, type Address } from "viem";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextArea, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { Notifications } from "@/components/notifications";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/workflow-card";
import { WorkspacePanel } from "@/components/workspace-panel";
import type {
  AssessmentRecord,
  CandidateRecord,
  ReputationSignalRecord,
  SkillProofRecord,
  VerifierProposalRecord,
} from "@/lib/contracts/blindhire";
import { asPositiveBigInt, asWholeBigInt, decodeMetadata, inputErrorMessage, shortAddress } from "@/lib/metadata";
import { prepareMetadata } from "@/lib/pinning";
import { metadataContentHash } from "@/lib/storage";
import { useBlindHire } from "@/lib/use-blindhire";

export default function VerifierPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [proofs, setProofs] = useState<SkillProofRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [reputation, setReputation] = useState<ReputationSignalRecord[]>([]);
  const [proposals, setProposals] = useState<VerifierProposalRecord[]>([]);
  const [verifyForm, setVerifyForm] = useState({ candidateId: "1", proofIndex: "0" });
  const [assessmentForm, setAssessmentForm] = useState({ candidateId: "1", assessmentIndex: "0" });
  const [reputationForm, setReputationForm] = useState({
    candidateId: "1",
    weight: "25",
    title: "Verified shipped work",
    notes: "Evidence of production contribution without identity disclosure.",
    uri: "",
  });
  const [verifierForm, setVerifierForm] = useState({ verifier: "" });
  const [proposalId, setProposalId] = useState("1");
  const [owner, setOwner] = useState<Address>();
  const {
    contractAddress,
    loadAssessments,
    loadCandidates,
    loadProofs,
    loadReputationSignals,
    loadVerifierProposals,
    readContract,
  } = chain;

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
    const nextAssessments = (
      await Promise.all(nextCandidates.map((candidate) => loadAssessments(candidate)))
    ).flat();
    const nextReputation = (
      await Promise.all(nextCandidates.map((candidate) => loadReputationSignals(candidate)))
    ).flat();
    setCandidates(nextCandidates);
    setProofs(nextProofs);
    setAssessments(nextAssessments);
    setReputation(nextReputation);
    setProposals(await loadVerifierProposals());
    setOwner(nextOwner);
  }, [contractAddress, loadAssessments, loadCandidates, loadProofs, loadReputationSignals, loadVerifierProposals, readContract]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const verifyProof = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      return;
    }

    let candidateId: bigint;
    let proofIndex: bigint;
    try {
      candidateId = asPositiveBigInt(verifyForm.candidateId, "Candidate ID");
      proofIndex = asWholeBigInt(verifyForm.proofIndex, "Proof index", { min: 0n });
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    await chain.writeContract("verifySkillProof", [candidateId, proofIndex]);
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

  const verifyAssessment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      return;
    }

    let candidateId: bigint;
    let assessmentIndex: bigint;
    try {
      candidateId = asPositiveBigInt(assessmentForm.candidateId, "Candidate ID");
      assessmentIndex = asWholeBigInt(assessmentForm.assessmentIndex, "Assessment index", { min: 0n });
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    await chain.writeContract("verifyAssessment", [candidateId, assessmentIndex]);
    addLog(`Assessment #${assessmentForm.assessmentIndex} verified for candidate #${assessmentForm.candidateId}.`);
    await refresh();
  };

  const recordReputation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      return;
    }

    let candidateId: bigint;
    let weight: bigint;
    try {
      candidateId = asPositiveBigInt(reputationForm.candidateId, "Candidate ID");
      weight = asWholeBigInt(reputationForm.weight, "Reputation weight", { min: 1n, max: 100n });
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    const uri = await prepareMetadata(
      {
        kind: "reputation",
        title: reputationForm.title,
        notes: reputationForm.notes,
      },
      { externalUri: reputationForm.uri, label: "reputation metadata", onStatus: addLog },
    );

    await chain.writeContract("recordReputationSignal", [
      candidateId,
      uri,
      metadataContentHash(uri),
      weight,
    ]);
    addLog(`Reputation signal recorded for candidate #${reputationForm.candidateId}.`);
    await refresh();
  };

  const proposeVerifier = async () => {
    if (!chain.ready) {
      await chain.connect();
      return;
    }
    if (!isAddress(verifierForm.verifier)) {
      addLog("Verifier address is invalid.");
      return;
    }

    await chain.writeContract("proposeVerifier", [verifierForm.verifier]);
    addLog(`Verifier proposal created for ${shortAddress(verifierForm.verifier)}.`);
    await refresh();
  };

  const approveProposal = async () => {
    if (!chain.ready) {
      await chain.connect();
      return;
    }

    let parsedProposalId: bigint;
    try {
      parsedProposalId = asPositiveBigInt(proposalId, "Proposal ID");
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    await chain.writeContract("approveVerifierProposal", [parsedProposalId]);
    addLog(`Verifier proposal #${proposalId} approved.`);
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

      <section className="container grid gap-6 py-8 md:grid-cols-4">
        <MetricTile label="Candidates" value={candidates.length.toString()} detail="Profiles visible for verifier review." />
        <MetricTile label="Proofs" value={proofs.length.toString()} detail="Submitted proof records." />
        <MetricTile label="Assessments" value={assessments.length.toString()} detail="Anonymous work samples." />
        <MetricTile label="Reputation" value={reputation.length.toString()} detail="Recorded reputation signals." />
      </section>

      <section className="container grid gap-8 py-8 lg:grid-cols-2">
        <WorkspacePanel eyebrow="Attestation" title="Verify candidate proof" body="Use the proof ledger below to pick the candidate ID and proof index.">
          <form onSubmit={verifyProof} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Candidate ID">
                <TextInput value={verifyForm.candidateId} onChange={(e) => setVerifyForm((current) => ({ ...current, candidateId: e.target.value }))} />
              </Field>
              <Field label="Proof Index">
                <TextInput value={verifyForm.proofIndex} onChange={(e) => setVerifyForm((current) => ({ ...current, proofIndex: e.target.value }))} />
              </Field>
            </div>
            <Button type="submit" disabled={chain.busy}>
              <BadgeCheck />
              [Verify Proof]
            </Button>
          </form>
        </WorkspacePanel>

        <WorkspacePanel eyebrow="Assessment" title="Verify work sample" body="Approve anonymous assessments after reviewing their anchored evidence.">
          <form onSubmit={verifyAssessment} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Candidate ID">
                <TextInput value={assessmentForm.candidateId} onChange={(e) => setAssessmentForm((current) => ({ ...current, candidateId: e.target.value }))} />
              </Field>
              <Field label="Assessment Index">
                <TextInput value={assessmentForm.assessmentIndex} onChange={(e) => setAssessmentForm((current) => ({ ...current, assessmentIndex: e.target.value }))} />
              </Field>
            </div>
            <Button type="submit" disabled={chain.busy}>
              <ClipboardCheck />
              [Verify Assessment]
            </Button>
          </form>
        </WorkspacePanel>
      </section>

      <section className="container grid gap-8 pb-12 lg:grid-cols-2">
        <WorkspacePanel eyebrow="Reputation" title="Record reputation signal" body="Trusted verifiers can add weighted signals after reviewing proof quality.">
          <form onSubmit={recordReputation} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Candidate ID">
                <TextInput value={reputationForm.candidateId} onChange={(e) => setReputationForm((current) => ({ ...current, candidateId: e.target.value }))} />
              </Field>
              <Field label="Weight">
                <TextInput type="number" min="1" max="100" value={reputationForm.weight} onChange={(e) => setReputationForm((current) => ({ ...current, weight: e.target.value }))} />
              </Field>
            </div>
            <Field label="Signal Title">
              <TextInput value={reputationForm.title} onChange={(e) => setReputationForm((current) => ({ ...current, title: e.target.value }))} />
            </Field>
            <Field label="Permanent Signal URI">
              <TextInput value={reputationForm.uri} onChange={(e) => setReputationForm((current) => ({ ...current, uri: e.target.value }))} placeholder="ipfs://... or ar://..." />
            </Field>
            <Field label="Notes">
              <TextArea value={reputationForm.notes} onChange={(e) => setReputationForm((current) => ({ ...current, notes: e.target.value }))} />
            </Field>
            <Button type="submit" disabled={chain.busy}>
              <Sparkles />
              [Record Reputation]
            </Button>
          </form>
        </WorkspacePanel>

        <WorkspacePanel eyebrow="Governance" title="Verifier registry" body={`Contract owner: ${shortAddress(owner)}. Owner can add directly; trusted verifiers can use proposals.`}>
          <form onSubmit={setVerifier} className="space-y-6">
            <Field label="Verifier Address">
              <TextInput value={verifierForm.verifier} onChange={(e) => setVerifierForm({ verifier: e.target.value })} placeholder="0x..." />
            </Field>
            <Button type="submit" disabled={chain.busy}>
              <ShieldPlus />
              [Add Trusted Verifier]
            </Button>
            <div className="flex flex-wrap items-end gap-4 border-t border-border/70 pt-6">
              <Button type="button" variant="secondary" onClick={proposeVerifier} disabled={chain.busy}>
                [Propose]
              </Button>
              <Field label="Proposal ID" className="min-w-36">
                <TextInput value={proposalId} onChange={(e) => setProposalId(e.target.value)} />
              </Field>
              <Button type="button" variant="secondary" onClick={approveProposal} disabled={chain.busy}>
                [Approve]
              </Button>
            </div>
          </form>
        </WorkspacePanel>
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

      <Ledger title="Assessment Review">
        {assessments.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No assessments are on-chain yet.</p>
          </LedgerRow>
        ) : (
          assessments.map((assessment) => {
            const metadata = decodeMetadata(assessment.assessmentURI);
            return (
              <LedgerRow key={`${assessment.candidateId.toString()}-${assessment.assessmentIndex.toString()}`}>
                <div>
                  <StateLabel state={assessment.verified ? "verified" : "pending"}>
                    Candidate #{assessment.candidateId.toString()} Assessment #{assessment.assessmentIndex.toString()}
                  </StateLabel>
                  <h3 className="mt-3 font-sentient text-3xl">{String(metadata.title || assessment.assessmentURI)}</h3>
                  <p className="mt-2 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
                    {String(metadata.notes || "Assessment metadata anchored on-chain.")}
                  </p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground/40">
                    Hash {assessment.assessmentHash.slice(0, 16)}... | Verifier {shortAddress(assessment.verifier)}
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/45">
                  {assessment.verified ? "Verified" : "Waiting"}
                </span>
              </LedgerRow>
            );
          })
        )}
      </Ledger>

      <Ledger title="Verifier Governance">
        {proposals.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No verifier proposals yet.</p>
          </LedgerRow>
        ) : (
          proposals.map((proposal) => (
            <LedgerRow key={proposal.id.toString()}>
              <div>
                <StateLabel state={proposal.executed ? "verified" : "pending"}>Proposal #{proposal.id.toString()}</StateLabel>
                <h3 className="mt-3 font-sentient text-3xl">{shortAddress(proposal.verifier)}</h3>
                <p className="mt-2 font-mono text-sm text-foreground/55">
                  Proposed by {shortAddress(proposal.proposer)} | Approvals {proposal.approvals.toString()}
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/45">
                {proposal.executed ? "Trusted" : "Open"}
              </span>
            </LedgerRow>
          ))
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
                    {" "}Assessments {candidate.assessmentCount.toString()} | Reputation {candidate.reputationScore.toString()}.
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/45">Identity sealed</span>
              </LedgerRow>
            );
          })
        )}
      </Ledger>

      <Ledger title="Reputation History">
        {reputation.length === 0 ? (
          <LedgerRow>
            <p className="font-mono text-sm text-foreground/50">No reputation signals yet.</p>
          </LedgerRow>
        ) : (
          reputation.map((signal) => {
            const metadata = decodeMetadata(signal.signalURI);
            return (
              <LedgerRow key={`${signal.candidateId.toString()}-${signal.signalIndex.toString()}`}>
                <div>
                  <StateLabel state="verified">Candidate #{signal.candidateId.toString()} Signal #{signal.signalIndex.toString()}</StateLabel>
                  <h3 className="mt-3 font-sentient text-3xl">{String(metadata.title || "Reputation signal")}</h3>
                  <p className="mt-2 font-mono text-sm text-foreground/55">
                    Weight {signal.weight.toString()} | Issuer {shortAddress(signal.issuer)}
                  </p>
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
