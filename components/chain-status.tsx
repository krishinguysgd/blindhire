"use client";

import { PlugZap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/metadata";
import type { useBlindHire } from "@/lib/use-blindhire";

type ChainStatusProps = {
  chain: ReturnType<typeof useBlindHire>;
};

export function ChainStatus({ chain }: ChainStatusProps) {
  return (
    <section className="border-y border-border/80 bg-black/35 backdrop-blur-md">
      <div className="container grid gap-5 py-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-3 font-mono text-xs uppercase tracking-[0.18em] text-foreground/55 md:grid-cols-3">
          <span>
            Network
            <strong className="mt-1 block text-sm normal-case tracking-normal text-foreground">
              {chain.selectedChain.label}
            </strong>
          </span>
          <span>
            Wallet
            <strong className="mt-1 block text-sm normal-case tracking-normal text-foreground">
              {shortAddress(chain.account)}
            </strong>
          </span>
          <span>
            Contract
            <strong className="mt-1 block text-sm normal-case tracking-normal text-foreground">
              {chain.contractAddress ? shortAddress(chain.contractAddress) : "Not configured"}
            </strong>
          </span>
        </div>
        <Button size="sm" onClick={chain.connect} disabled={chain.connecting || chain.busy}>
          {chain.ready ? <ShieldCheck /> : <PlugZap />}
          {chain.ready ? "[Ready]" : chain.connecting ? "[Connecting]" : "[Connect Wallet]"}
        </Button>
      </div>
      <div className="container pb-5 font-mono text-xs text-foreground/55">
        {chain.error ? <span className="text-red-300">{chain.error}</span> : <span>{chain.message}</span>}
      </div>
    </section>
  );
}
