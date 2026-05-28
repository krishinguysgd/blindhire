"use client";

import Link from "next/link";
import { GL } from "./gl";
import { Pill } from "./pill";
import { Button } from "./ui/button";
import { useState } from "react";
import { BriefcaseBusiness, LayoutDashboard } from "lucide-react";

export function Hero() {
  const [hovering, setHovering] = useState(false);
  return (
    <div className="flex flex-col h-svh justify-between">
      <GL hovering={hovering} />

      <div className="relative z-10 mt-auto px-4 pb-16 text-center">
        <Pill className="mb-6">ON-CHAIN PRIVATE HIRING</Pill>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sentient">
          Hire talent. <br />
          <i className="font-light">Not bias.</i>
        </h1>
        <p className="font-mono text-sm sm:text-base text-foreground/60 text-balance mt-8 max-w-[440px] mx-auto">
          Anonymous profiles, encrypted matching, verified skill proofs, and candidate-controlled identity reveal.
        </p>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
        <Link className="contents" href="/dashboard">
          <Button
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <LayoutDashboard />
            [Open Dashboard]
          </Button>
        </Link>
        <Link className="contents max-sm:hidden" href="/roadmap">
          <Button
            variant="secondary"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <BriefcaseBusiness />
            [View Flow]
          </Button>
        </Link>
        </div>
      </div>
    </div>
  );
}
