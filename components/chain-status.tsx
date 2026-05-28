"use client";

import { useEffect, useState } from "react";
import { PlugZap, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/metadata";
import type { useBlindHire } from "@/lib/use-blindhire";

type ChainStatusProps = {
  chain: ReturnType<typeof useBlindHire>;
};

export function ChainStatus({ chain }: ChainStatusProps) {
  const [roles, setRoles] = useState<string[]>([]);
  const [rpcMessage, setRpcMessage] = useState<string>();
  const { account, contractAddress, getRpcHealth, readContract } = chain;

  useEffect(() => {
    let cancelled = false;

    async function refreshStatus() {
      const health = await getRpcHealth();
      if (!cancelled) setRpcMessage(health.message);

      if (!account || !contractAddress) {
        if (!cancelled) setRoles([]);
        return;
      }

      try {
        const [owner, verifier, oracle] = await Promise.all([
          readContract<string>("owner"),
          readContract<boolean>("trustedVerifiers", [account]),
          readContract<boolean>("trustedAiOracles", [account]),
        ]);

        if (!cancelled) {
          setRoles([
            owner.toLowerCase() === account.toLowerCase() ? "Owner" : "",
            verifier ? "Verifier" : "",
            oracle ? "AI Oracle" : "",
          ].filter(Boolean));
        }
      } catch {
        if (!cancelled) setRoles([]);
      }
    }

    refreshStatus().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [account, contractAddress, getRpcHealth, readContract]);

  return (
    <section className="border-y border-border/80 bg-black/45 backdrop-blur-md">
      <div className="container grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,520px)_auto] xl:items-center">
        <div className="flex items-start gap-4">
          <div className="hidden border-y border-primary/50 py-3 text-primary sm:block">
            <Wallet className="size-5" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              {chain.ready ? "Wallet connected" : "Start here"}
            </p>
            <p className="mt-2 max-w-2xl font-mono text-sm leading-6 text-foreground/55">
              {chain.ready
                ? "You can now encrypt inputs, submit transactions, decrypt authorized data, and refresh live on-chain records."
                : "Connect a wallet first. After connection, pick the role workspace that matches what you want to do next."}
            </p>
          </div>
        </div>
        <div className="grid gap-3 font-mono text-xs uppercase tracking-[0.18em] text-foreground/55 sm:grid-cols-2 xl:grid-cols-4">
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
          <span>
            Roles
            <strong className="mt-1 block text-sm normal-case tracking-normal text-foreground">
              {roles.length ? roles.join(" / ") : "Open wallet"}
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
        {rpcMessage ? <span className="ml-3 text-foreground/35">{rpcMessage}</span> : null}
      </div>
    </section>
  );
}
