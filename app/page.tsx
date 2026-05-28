'use client'

import { Hero } from "@/components/hero";
import { Leva } from "leva";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <Hero />
      <Leva hidden />
      <main className="relative z-10 border-t border-border/80 bg-black/45 backdrop-blur-md">
        <section className="container grid gap-10 py-14 md:grid-cols-3">
          {[
            {
              icon: UserRoundSearch,
              title: "Anonymous first screen",
              body: "Recruiters see skills, projects, proof counts, and match quality before names, photos, or location.",
            },
            {
              icon: LockKeyhole,
              title: "Encrypted on-chain matching",
              body: "CoFHE encrypts salary, experience, skill scores, and AI signal before contract computation.",
            },
            {
              icon: ShieldCheck,
              title: "Candidate-controlled reveal",
              body: "Identity is written on-chain only after shortlist, reveal request, and candidate approval.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="border-y border-border/70 py-7">
                <Icon className="mb-5 size-6 text-primary" />
                <h2 className="font-sentient text-3xl">{item.title}</h2>
                <p className="mt-4 font-mono text-sm leading-7 text-foreground/55">{item.body}</p>
              </div>
            );
          })}
        </section>
        <section className="border-t border-border/80">
          <div className="container flex flex-wrap items-center justify-between gap-6 py-10">
            <div>
              <h2 className="font-sentient text-4xl">Run the demo in six moves.</h2>
              <p className="mt-3 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
                Candidate profile, proof upload, verifier attestation, recruiter job, encrypted match, then selective identity reveal.
              </p>
            </div>
            <Link href="/dashboard">
              <Button>
                <ArrowRight />
                [Open Dashboard]
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
