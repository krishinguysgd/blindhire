"use client";

import { useEffect, useState } from "react";
import { PlugZap, ShieldCheck } from "lucide-react";
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
    <section className="border-y border-border/80 bg-black/35 backdrop-blur-md">
      <div className="container grid gap-5 py-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-3 font-mono text-xs uppercase tracking-[0.18em] text-foreground/55 md:grid-cols-4">
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
