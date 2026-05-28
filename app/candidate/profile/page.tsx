"use client";

import { useCallback, useState } from "react";
import { Send } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextArea, TextInput } from "@/components/form-field";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { StepAside, WorkspacePanel } from "@/components/workspace-panel";
import { asPositiveBigInt, asUint32, inputErrorMessage, splitList } from "@/lib/metadata";
import { prepareMetadata } from "@/lib/pinning";
import { identityCommitment, identitySalt } from "@/lib/storage";
import { useBlindHire } from "@/lib/use-blindhire";

const defaults = {
  alias: "",
  role: "",
  headline: "",
  skills: "",
  projects: "",
  skillScore: "",
  experienceYears: "",
  salaryMin: "",
  salaryMax: "",
  identityName: "",
  identityEmail: "",
  identityLocation: "",
  identityPortfolio: "",
  identityNote: "",
  identitySecret: "",
  identityUri: "",
  existingCandidateId: "1",
  profileUri: "",
};

export default function CandidateProfilePage() {
  const chain = useBlindHire();
  const [form, setForm] = useState(defaults);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const updateForm = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const createProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Submit again to encrypt and send the profile transaction.");
      return;
    }

    let privateValues: bigint[];
    try {
      const salaryMin = asUint32(form.salaryMin, "Private salary minimum");
      const salaryMax = asUint32(form.salaryMax, "Private salary maximum");
      if (salaryMin > salaryMax) throw new Error("Private salary minimum must be less than or equal to maximum.");
      privateValues = [
        asUint32(form.skillScore, "Private skill score", { max: 100n }),
        asUint32(form.experienceYears, "Private years"),
        salaryMin,
        salaryMax,
      ];
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    addLog("Encrypting private candidate values.");
    const encrypted = await chain.encryptUint32(privateValues, addLog);
    const committedIdentityURI = await prepareMetadata(
      {
        kind: "identity",
        name: form.identityName,
        email: form.identityEmail,
        location: form.identityLocation,
        portfolio: form.identityPortfolio,
        note: form.identityNote,
      },
      { externalUri: form.identityUri, label: "identity metadata", onStatus: addLog },
    );
    const committedIdentitySalt = identitySalt(form.identitySecret);
    const commitment = identityCommitment(committedIdentityURI, committedIdentitySalt);
    const anonymousProfileURI = await prepareMetadata(
      {
        kind: "candidate",
        alias: form.alias,
        role: form.role,
        headline: form.headline,
        skills: splitList(form.skills),
        projects: splitList(form.projects),
      },
      { externalUri: form.profileUri, label: "anonymous profile metadata", onStatus: addLog },
    );

    await chain.writeContract("createCandidate", [
      anonymousProfileURI,
      commitment,
      encrypted[0],
      encrypted[1],
      encrypted[2],
      encrypted[3],
    ]);

    addLog("Anonymous profile created. Identity is committed, not revealed.");
  };

  const updateProfile = async () => {
    if (!chain.ready) {
      if (await chain.connect()) addLog("Wallet connected. Click update again to send the profile update.");
      return;
    }

    const anonymousProfileURI = await prepareMetadata(
      {
        kind: "candidate",
        alias: form.alias,
        role: form.role,
        headline: form.headline,
        skills: splitList(form.skills),
        projects: splitList(form.projects),
      },
      { externalUri: form.profileUri, label: "anonymous profile metadata", onStatus: addLog },
    );

    let candidateId: bigint;
    try {
      candidateId = asPositiveBigInt(form.existingCandidateId, "Candidate ID");
    } catch (error) {
      addLog(inputErrorMessage(error));
      return;
    }

    await chain.writeContract("updateCandidateProfile", [candidateId, anonymousProfileURI]);
    addLog(`Candidate #${form.existingCandidateId} profile metadata updated on-chain.`);
  };

  return (
    <PageShell
      eyebrow="Candidate Profile"
      title="Create the anonymous profile."
      kicker="This page only handles profile creation: public anonymous metadata plus encrypted score, experience, and salary range."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-8 py-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={createProfile} className="space-y-7">
          <WorkspacePanel
            eyebrow="Step 01"
            title="Anonymous profile"
            body="This is what recruiters see before reveal. Keep it skill-first and free of identity clues."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Anonymous Alias">
                <TextInput value={form.alias} onChange={(e) => updateForm("alias", e.target.value)} placeholder="e.g. protocol-builder-42" />
              </Field>
              <Field label="Skill-First Role">
                <TextInput value={form.role} onChange={(e) => updateForm("role", e.target.value)} placeholder="e.g. Senior Frontend Protocol Engineer" />
              </Field>
            </div>
            <div className="mt-6 grid gap-6">
              <Field label="Anonymous Profile Summary">
                <TextArea value={form.headline} onChange={(e) => updateForm("headline", e.target.value)} placeholder="Summarize experience without name, photo, school, or location." />
              </Field>
              <Field label="Permanent Profile URI">
                <TextInput value={form.profileUri} onChange={(e) => updateForm("profileUri", e.target.value)} placeholder="ipfs://... or ar://..." />
              </Field>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Field label="Skills">
                <TextArea value={form.skills} onChange={(e) => updateForm("skills", e.target.value)} placeholder="Comma-separated skills for recruiters to review." />
              </Field>
              <Field label="Projects">
                <TextArea value={form.projects} onChange={(e) => updateForm("projects", e.target.value)} placeholder="Public project summaries that do not reveal identity." />
              </Field>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            eyebrow="Step 02"
            title="Encrypted matching values"
            body="These numbers are encrypted in the browser before the transaction is sent."
          >
            <div className="grid gap-6 md:grid-cols-4">
              <Field label="Private Skill Score">
                <TextInput type="number" min="0" max="100" value={form.skillScore} onChange={(e) => updateForm("skillScore", e.target.value)} placeholder="0-100" />
              </Field>
              <Field label="Private Years">
                <TextInput type="number" min="0" value={form.experienceYears} onChange={(e) => updateForm("experienceYears", e.target.value)} placeholder="Years" />
              </Field>
              <Field label="Private Salary Min">
                <TextInput type="number" min="0" value={form.salaryMin} onChange={(e) => updateForm("salaryMin", e.target.value)} placeholder="Minimum" />
              </Field>
              <Field label="Private Salary Max">
                <TextInput type="number" min="0" value={form.salaryMax} onChange={(e) => updateForm("salaryMax", e.target.value)} placeholder="Maximum" />
              </Field>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            eyebrow="Step 03"
            title="Reveal commitment"
            body="This identity stays private until a recruiter requests reveal and you approve it later."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Reveal Name">
                <TextInput value={form.identityName} onChange={(e) => updateForm("identityName", e.target.value)} placeholder="Legal or preferred name" />
              </Field>
              <Field label="Reveal Email">
                <TextInput type="email" value={form.identityEmail} onChange={(e) => updateForm("identityEmail", e.target.value)} placeholder="name@company.com" />
              </Field>
              <Field label="Reveal Location">
                <TextInput value={form.identityLocation} onChange={(e) => updateForm("identityLocation", e.target.value)} placeholder="City, country" />
              </Field>
              <Field label="Reveal Portfolio">
                <TextInput value={form.identityPortfolio} onChange={(e) => updateForm("identityPortfolio", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Reveal Note">
                <TextInput value={form.identityNote} onChange={(e) => updateForm("identityNote", e.target.value)} placeholder="Optional context for the recruiter" />
              </Field>
              <Field label="Permanent Identity URI">
                <TextInput value={form.identityUri} onChange={(e) => updateForm("identityUri", e.target.value)} placeholder="ipfs://... or ar://..." />
              </Field>
            </div>
            <div className="mt-6">
              <Field label="Identity Commitment Secret">
                <TextInput type="password" value={form.identitySecret} onChange={(e) => updateForm("identitySecret", e.target.value)} placeholder="Save this secret for reveal approval" />
              </Field>
            </div>
          </WorkspacePanel>

          <Button type="submit" disabled={chain.busy || chain.connecting}>
            <Send />
            [Encrypt & Create Profile]
          </Button>
        </form>

        <div className="space-y-6 xl:sticky xl:top-32 xl:self-start">
          <StepAside
            title="Profile flow"
            steps={["Connect wallet.", "Write anonymous metadata and encrypted values.", "Keep the identity secret saved for reveal approval.", "Add proofs or browse jobs from the candidate workspace."]}
            note="If you change the profile later, use the update panel below. The original identity commitment remains the reveal guard."
          />
          <WorkspacePanel title="Update existing profile" body="Use this only when the anonymous profile metadata needs to change.">
            <div className="space-y-5">
              <Field label="Existing Candidate ID">
                <TextInput value={form.existingCandidateId} onChange={(e) => updateForm("existingCandidateId", e.target.value)} placeholder="Candidate ID" />
              </Field>
              <Button type="button" variant="secondary" disabled={chain.busy || chain.connecting} onClick={updateProfile}>
                [Update Metadata]
              </Button>
            </div>
          </WorkspacePanel>
        </div>
      </section>
    </PageShell>
  );
}
