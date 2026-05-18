"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Send } from "lucide-react";
import { ActionLog } from "@/components/action-log";
import { ChainStatus } from "@/components/chain-status";
import { Field, TextArea, TextInput } from "@/components/form-field";
import { Ledger, LedgerRow, StateLabel } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import type { JobRecord } from "@/lib/contracts/blindhire";
import { asUint32, decodeMetadata, encodeMetadata, splitList } from "@/lib/metadata";
import { useBlindHire } from "@/lib/use-blindhire";

const defaults = {
  company: "CipherWorks Labs",
  role: "Senior Frontend Protocol Engineer",
  description: "Own wallet flows, private matching dashboards, and security-sensitive product surfaces.",
  requirements: "React, TypeScript, DeFi, wallet UX, smart contract literacy",
  requiredSkillScore: "85",
  minExperienceYears: "4",
  salaryMin: "125000",
  salaryMax: "175000",
};

export default function RecruiterJobsPage() {
  const chain = useBlindHire();
  const [form, setForm] = useState(defaults);
  const [logs, setLogs] = useState<string[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const { account, contractAddress, loadJobs } = chain;

  const addLog = useCallback((item: string) => setLogs((current) => [...current, item]), []);
  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    setJobs(await loadJobs());
  }, [contractAddress, loadJobs]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const myJobs = useMemo(() => {
    if (!account) return jobs;
    return jobs.filter((job) => job.recruiter.toLowerCase() === account.toLowerCase());
  }, [account, jobs]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const postJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chain.ready) {
      await chain.connect();
      addLog("Wallet connected. Submit again to encrypt and post the job.");
      return;
    }

    addLog("Encrypting job thresholds and salary band.");
    const encrypted = await chain.encryptUint32(
      [asUint32(form.requiredSkillScore), asUint32(form.minExperienceYears), asUint32(form.salaryMin), asUint32(form.salaryMax)],
      addLog,
    );
    await chain.writeContract("postJob", [
      encodeMetadata({
        kind: "job",
        company: form.company,
        role: form.role,
        description: form.description,
        requirements: splitList(form.requirements),
      }),
      encrypted[0],
      encrypted[1],
      encrypted[2],
      encrypted[3],
    ]);
    addLog("Job posted with encrypted requirements.");
    await refresh();
  };

  return (
    <PageShell
      eyebrow="Job Posting"
      title="Post an encrypted job."
      kicker="This page only handles job creation. Salary and threshold values are encrypted before the transaction."
    >
      <ChainStatus chain={chain} />
      <ActionLog items={logs} />

      <section className="container grid gap-10 py-12 lg:grid-cols-[1fr_0.9fr]">
        <form onSubmit={postJob} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Company">
              <TextInput value={form.company} onChange={(e) => update("company", e.target.value)} />
            </Field>
            <Field label="Role">
              <TextInput value={form.role} onChange={(e) => update("role", e.target.value)} />
            </Field>
          </div>
          <Field label="Role Brief">
            <TextArea value={form.description} onChange={(e) => update("description", e.target.value)} />
          </Field>
          <Field label="Requirements">
            <TextArea value={form.requirements} onChange={(e) => update("requirements", e.target.value)} />
          </Field>
          <div className="grid gap-6 md:grid-cols-4">
            <Field label="Required Skill">
              <TextInput type="number" value={form.requiredSkillScore} onChange={(e) => update("requiredSkillScore", e.target.value)} />
            </Field>
            <Field label="Min Years">
              <TextInput type="number" value={form.minExperienceYears} onChange={(e) => update("minExperienceYears", e.target.value)} />
            </Field>
            <Field label="Budget Min">
              <TextInput type="number" value={form.salaryMin} onChange={(e) => update("salaryMin", e.target.value)} />
            </Field>
            <Field label="Budget Max">
              <TextInput type="number" value={form.salaryMax} onChange={(e) => update("salaryMax", e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={chain.busy || chain.connecting}>
            <Send />
            [Encrypt & Post Job]
          </Button>
        </form>

        <Ledger
          title="My Job Ledger"
          action={
            <Button type="button" size="sm" onClick={refresh}>
              <RefreshCcw />
              [Refresh]
            </Button>
          }
          className="border-t-0"
        >
          {myJobs.length === 0 ? (
            <LedgerRow>
              <p className="font-mono text-sm text-foreground/50">No jobs found for this wallet yet.</p>
            </LedgerRow>
          ) : (
            myJobs.map((job) => {
              const metadata = decodeMetadata(job.jobURI);
              return (
                <LedgerRow key={job.id.toString()}>
                  <div>
                    <StateLabel state={job.open ? "pending" : "verified"}>Job #{job.id.toString()}</StateLabel>
                    <h3 className="mt-3 font-sentient text-3xl">{String(metadata.role || "Private Role")}</h3>
                    <p className="mt-2 font-mono text-sm text-foreground/55">{String(metadata.description || "Encrypted requirements")}</p>
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
