"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, RefreshCcw } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextArea, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { Notifications } from "@/components/notifications";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { StepAside, WorkspacePanel } from "@/components/workspace-panel";
import type { AssessmentRecord } from "@/lib/contracts/blindhire";
import { asPositiveBigInt, decodeMetadata, inputErrorMessage, splitList, shortAddress } from "@/lib/metadata";
import { prepareMetadata } from "@/lib/pinning";
import { metadataContentHash } from "@/lib/storage";
import { useBlindHire } from "@/lib/use-blindhire";

export default function CandidateAssessmentsPage() {
  const chain = useBlindHire();
  const [logs, setLogs] = useState<string[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [form, setForm] = useState({
    candidateId: "1",
    title: "Blind coding assessment",
    rubric: "TypeScript, wallet UX, security edge cases",
    scoreBand: "top 10%",
    evidenceUri: "",
    notes: "Anonymous work sample completed without identity fields.",
  });
  const { contractAddress, loadAssessments, loadCandidates } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    const nextCandidates = await loadCandidates();
    setAssessments((await Promise.all(nextCandidates.map((candidate) => loadAssessments(candidate)))).flat());
  }, [contractAddress, loadAssessments, loadCandidates]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submitAssessment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Submit again to write the assessment on-chain.");
      return;
    }

    const uri = await prepareMetadata(
      {
        kind: "assessment",
        title: form.title,
        rubric: splitList(form.rubric),
        scoreBand: form.scoreBand,
        notes: form.notes,
      },
      { externalUri: form.evidenceUri, label: "assessment metadata", onStatus: addLog },
    );

    let candidateId: bigint;
    try {
      candidateId = asPositiveBigInt(form.candidateId, "Candidate ID");
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    await chain.writeContract("submitAssessment", [candidateId, uri, metadataContentHash(uri)]);
    addLog(`Assessment submitted for candidate #${form.candidateId}.`);
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Anonymous Assessments"
      title="Add work-sample evidence without identity leakage."
      kicker="Assessment metadata can point at IPFS, Arweave, or another permanent URI while the content hash is anchored on-chain."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-8 py-10 xl:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
        <div className="space-y-6">
          <WorkspacePanel
            eyebrow="Work sample"
            title="Submit anonymous assessment"
            body="Use this for coding tasks, work samples, interviews, or rubric-based evidence that should not reveal identity."
          >
            <form onSubmit={submitAssessment} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Candidate ID">
                  <TextInput value={form.candidateId} onChange={(event) => update("candidateId", event.target.value)} />
                </Field>
                <Field label="Score Band">
                  <TextInput value={form.scoreBand} onChange={(event) => update("scoreBand", event.target.value)} />
                </Field>
              </div>
              <Field label="Assessment Title">
                <TextInput value={form.title} onChange={(event) => update("title", event.target.value)} />
              </Field>
              <Field label="Rubric">
                <TextArea value={form.rubric} onChange={(event) => update("rubric", event.target.value)} />
              </Field>
              <Field label="Permanent Evidence URI">
                <TextInput value={form.evidenceUri} onChange={(event) => update("evidenceUri", event.target.value)} placeholder="ipfs://... or ar://..." />
              </Field>
              <Field label="Notes">
                <TextArea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
              </Field>
              <Button type="submit" disabled={chain.busy}>
                <ClipboardCheck />
                [Submit Assessment]
              </Button>
            </form>
          </WorkspacePanel>
          <StepAside
            title="Assessment flow"
            steps={["Attach anonymous work-sample metadata.", "Pin or provide a permanent evidence URI.", "Submit the content hash on-chain.", "Verifier reviews and marks the assessment verified."]}
          />
        </div>

        <Ledger
          title="Assessment Ledger"
          action={
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          }
          className="border-t-0"
          contained={false}
        >
          {assessments.length === 0 ? (
            <LedgerRow>
              <p className="font-mono text-sm text-foreground/50">No assessments are on-chain yet.</p>
            </LedgerRow>
          ) : (
            assessments.map((assessment) => {
              const metadata = decodeMetadata(assessment.assessmentURI);
              return (
                <LedgerRow key={`${assessment.candidateId}-${assessment.assessmentIndex}`}>
                  <div>
                    <StateLabel state={assessment.verified ? "verified" : "pending"}>
                      Candidate #{assessment.candidateId.toString()} Assessment #{assessment.assessmentIndex.toString()}
                    </StateLabel>
                    <h3 className="mt-3 font-sentient text-3xl">{String(metadata.title || assessment.assessmentURI)}</h3>
                    <p className="mt-2 font-mono text-sm text-foreground/55">
                      Verifier {shortAddress(assessment.verifier)} | Hash {assessment.assessmentHash.slice(0, 16)}...
                    </p>
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
