"use client";

import { useCallback, useState } from "react";
import { Send } from "lucide-react";
import { keccak256, toBytes } from "viem";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextArea, TextInput } from "@/components/form-field";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { asUint32, encodeMetadata, splitList } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

const defaults = {
  alias: "g5b16r",
  role: "Senior Frontend Protocol Engineer",
  headline: "5 years React, three DeFi products shipped, smart-contract audit literacy.",
  skills: "React, TypeScript, Solidity, DeFi, Smart contract audits",
  projects: "DEX analytics console, wallet security dashboard, governance tooling",
  skillScore: "92",
  experienceYears: "5",
  salaryMin: "130000",
  salaryMax: "170000",
  identityName: "Rahul Sharma",
  identityEmail: "rahul@example.com",
  identityLocation: "Bengaluru, India",
  identityPortfolio: "https://portfolio.example.com",
  identitySecret: "blindhire-demo-secret",
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
      await chain.connect();
      addLog("Wallet connected. Submit again to encrypt and send the profile transaction.");
      return;
    }

    addLog("Encrypting private candidate values.");
    const encrypted = await chain.encryptUint32(
      [asUint32(form.skillScore), asUint32(form.experienceYears), asUint32(form.salaryMin), asUint32(form.salaryMax)],
      addLog,
    );
    const identityCommitment = keccak256(
      toBytes(`${form.identityName}|${form.identityEmail}|${form.identityLocation}|${form.identitySecret}`),
    );
    const anonymousProfileURI = encodeMetadata({
      kind: "candidate",
      alias: form.alias,
      role: form.role,
      headline: form.headline,
      skills: splitList(form.skills),
      projects: splitList(form.projects),
    });

    await chain.writeContract("createCandidate", [
      anonymousProfileURI,
      identityCommitment,
      encrypted[0],
      encrypted[1],
      encrypted[2],
      encrypted[3],
    ]);

    localStorage.setItem(
      `blindhire:identity:${identityCommitment}`,
      encodeMetadata({
        kind: "identity",
        name: form.identityName,
        email: form.identityEmail,
        location: form.identityLocation,
        portfolio: form.identityPortfolio,
      }),
    );

    addLog("Anonymous profile created. Identity is committed, not revealed.");
  };

  return (
    <PageShell
      eyebrow="Candidate Profile"
      title="Create the anonymous profile."
      kicker="This page only handles profile creation: public anonymous metadata plus encrypted score, experience, and salary range."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container py-12">
        <form onSubmit={createProfile} className="max-w-5xl space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Anonymous Alias">
              <TextInput value={form.alias} onChange={(e) => updateForm("alias", e.target.value)} />
            </Field>
            <Field label="Skill-First Role">
              <TextInput value={form.role} onChange={(e) => updateForm("role", e.target.value)} />
            </Field>
          </div>
          <Field label="Anonymous Profile Summary">
            <TextArea value={form.headline} onChange={(e) => updateForm("headline", e.target.value)} />
          </Field>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Skills">
              <TextArea value={form.skills} onChange={(e) => updateForm("skills", e.target.value)} />
            </Field>
            <Field label="Projects">
              <TextArea value={form.projects} onChange={(e) => updateForm("projects", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            <Field label="Private Skill Score">
              <TextInput type="number" min="0" max="100" value={form.skillScore} onChange={(e) => updateForm("skillScore", e.target.value)} />
            </Field>
            <Field label="Private Years">
              <TextInput type="number" min="0" value={form.experienceYears} onChange={(e) => updateForm("experienceYears", e.target.value)} />
            </Field>
            <Field label="Private Salary Min">
              <TextInput type="number" min="0" value={form.salaryMin} onChange={(e) => updateForm("salaryMin", e.target.value)} />
            </Field>
            <Field label="Private Salary Max">
              <TextInput type="number" min="0" value={form.salaryMax} onChange={(e) => updateForm("salaryMax", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-6 border-t border-border/70 pt-8 md:grid-cols-2">
            <Field label="Reveal Name">
              <TextInput value={form.identityName} onChange={(e) => updateForm("identityName", e.target.value)} />
            </Field>
            <Field label="Reveal Email">
              <TextInput value={form.identityEmail} onChange={(e) => updateForm("identityEmail", e.target.value)} />
            </Field>
            <Field label="Reveal Location">
              <TextInput value={form.identityLocation} onChange={(e) => updateForm("identityLocation", e.target.value)} />
            </Field>
            <Field label="Reveal Portfolio">
              <TextInput value={form.identityPortfolio} onChange={(e) => updateForm("identityPortfolio", e.target.value)} />
            </Field>
          </div>
          <Field label="Identity Commitment Secret">
            <TextInput value={form.identitySecret} onChange={(e) => updateForm("identitySecret", e.target.value)} />
          </Field>
          <Button type="submit" disabled={chain.busy || chain.connecting}>
            <Send />
            [Encrypt & Create Profile]
          </Button>
        </form>
      </section>
    </PageShell>
  );
}
