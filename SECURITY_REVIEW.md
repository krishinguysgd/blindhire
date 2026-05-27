# BlindHire Security Review

## Scope

Reviewed production Wave 5 changes in `contracts/BlindHire.sol`, frontend contract bindings, CoFHE view-decryption flow, event indexing, and Sepolia deployment scripts.

## Controls In Place

- Candidate skill, experience, salary, job requirements, salary bands, AI signal, match score, salary overlap, and qualification remain encrypted CoFHE values.
- Encrypted handles are granted with `FHE.allowThis` and role-scoped `FHE.allow` for candidate and recruiter wallets.
- Identity reveal is two-step: recruiter requests, candidate approves, then identity metadata is verified against the original commitment before it is written.
- Candidate, job, and AI signal inputs are bounded with encrypted CoFHE min/max operations before matching.
- Duplicate identity commitments, proof hashes, assessment hashes, reputation hashes, match pairs, and match requests are blocked.
- Closed jobs and inactive candidate profiles cannot receive new matches.
- Inactive candidate profiles cannot receive new verifier proof/assessment approvals or reputation signals.
- Trusted verifier and trusted AI oracle roles are on-chain.
- Recruiter and trusted AI oracle match creation require a prior candidate match request for that candidate/job pair.
- Proof and assessment verification records are immutable after first approval, preserving the original verifier and timestamp.
- Verifier governance supports proposal + approval flow in addition to direct owner controls.
- Event indexing is used by the UI, with counter-based fallback for non-archive RPCs.
- Frontend transaction errors decode contract custom errors into user-facing messages.
- `npm run smoke:sepolia` now fails if deployed bytecode differs from the compiled local artifact.

## Metadata Boundaries

BlindHire stores URIs and content hashes on-chain. Larger profile, job, proof, assessment, identity, and reputation documents should use permanent storage such as IPFS or Arweave. The UI resolves those URIs through the configured metadata gateway and falls back to JSON metadata for local/demo usage. HTTPS references are stored inside JSON metadata as mutable references, not treated as permanent content-addressed storage.

## Residual Risks

- CoFHE SDK and Hardhat currently bring transitive audit findings with no compatible non-breaking fix available in npm audit. High-severity audit findings were removed with overrides; remaining findings are low/moderate and tied to CoFHE/Hardhat dependency chains.
- Direct owner controls still exist for emergency verifier/oracle management. Production ownership should be transferred to a multisig before real users.
- Public metadata can still leak information if users include identifying details before reveal. UI copy and defaults avoid this, but storage content is user-provided.
- Oracle quality is a trust assumption. The contract records the trusted oracle address and report hash, but it does not verify off-chain model quality.
- Gas sponsorship is configured as a future integration point; no paymaster is active in this repository.

## Recommended Launch Checklist

- Deploy from a dedicated testnet wallet and keep the private key outside repo files.
- Current hardened Sepolia deployment is `0xe0c76dA5c18F3d4d537dC94411E65713e900c376` from block `10932835`.
- Final May 27, 2026 checks passed `npm run validate:prod`, bytecode-parity Sepolia smoke, local route curl checks, and raw RPC curl checks for owner/counters.
- Set `NEXT_PUBLIC_BLINDHIRE_DEPLOY_BLOCK` to the deployment block for fast event indexing.
- Use a dedicated Sepolia RPC provider in production environment variables.
- Run `npm run validate:prod` before deploys.
- Run `npm run smoke:sepolia` against the deployed contract after env sync.
- Transfer contract ownership to a multisig before any non-demo deployment.
