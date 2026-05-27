# BlindHire

BlindHire is a privacy-first hiring application where candidates are evaluated on encrypted skill signals before their real identity is revealed.

The goal is simple: help companies hire talent, not bias. Recruiters can review anonymous profiles, verified proof counts, encrypted salary compatibility, and private match scores while candidates keep sensitive identity data hidden until they choose to reveal it.

## What The App Does

BlindHire turns the normal hiring flow from identity-first into skill-first.

- Candidates create anonymous profiles with encrypted skill score, experience, and salary range.
- Candidates upload proof metadata for skills, work history, certificates, or project ownership.
- Trusted verifiers attest candidate proofs on-chain.
- Recruiters post jobs with encrypted requirements and salary bands.
- Recruiters compute encrypted candidate/job matches on-chain.
- Authorized wallets decrypt match outputs locally through CoFHE permits.
- Recruiters shortlist matches and request identity reveal.
- Candidates approve the reveal only when they are ready.

Nothing important about matching is only a frontend trick. Candidate private values, job thresholds, proof status, matches, shortlists, reveal requests, and reveal approvals all flow through the smart contract.

## Why It Matters

Hiring often exposes too much personal data too early: name, location, age, university, gender signals, contact details, and career history. That creates bias and privacy risk before a candidate has even been evaluated fairly.

BlindHire keeps the first stage focused on capability:

- skill and experience signals
- verified work proofs
- salary compatibility
- encrypted match quality
- candidate-controlled disclosure

The long-term vision is a privacy-native hiring network where talent discovery is global, merit-based, and selective with personal data.

## User Roles

Candidate:
Creates an anonymous profile, submits skill proofs, reviews reveal requests, and approves identity disclosure.

Recruiter:
Posts jobs, computes encrypted matches, decrypts authorized scores, shortlists candidates, and requests identity reveal.

Verifier:
Confirms candidate proof submissions and manages trust status if the verifier wallet is the contract owner.

AI Matching Signal:
Today this is represented as an encrypted input to the match function, with an optional trusted AI/oracle path that records the oracle wallet and report hash. Both recruiter and oracle match creation require a prior candidate-created match request for the same candidate/job pair.

## How It Works

1. Candidate creates an anonymous profile.
   Public metadata includes alias, role, headline, skills, and project notes. Private values like skill score, years of experience, and salary range are encrypted before being sent on-chain.

2. Candidate commits identity privately.
   The contract stores an identity commitment. The real identity metadata stays off-chain until the candidate approves reveal.

3. Candidate adds skill proofs.
   Proof metadata and proof hashes are stored on-chain. Duplicate proof hashes are blocked.

4. Verifier attests proofs.
   Trusted verifiers mark proof submissions as verified. Verified proof count contributes to matching.

5. Recruiter posts an encrypted job.
   Job metadata is public, while required skill score, minimum experience, and salary range are encrypted.

6. Candidate requests a private match for a job.
   This on-chain consent record is required before any recruiter or trusted oracle can compute the match.

7. Recruiter or trusted oracle creates a private match.
   The contract computes encrypted skill fit, experience fit, salary overlap, qualification status, and a final encrypted score.

8. Authorized wallets decrypt locally.
   Candidate and recruiter wallets receive FHE access permissions for match outputs. Decryption happens client-side through CoFHE permits.

9. Recruiter requests reveal.
   The candidate identity remains hidden until the recruiter requests reveal and the candidate approves it.

10. Candidate approves identity reveal.
   The selected identity metadata becomes visible on the match record.

## Current Features

- Animated Next.js interface using the existing template motion and visual style.
- Separate pages for candidate, recruiter, verifier, matches, and roadmap flows.
- Wallet connection and chain switching for Sepolia-compatible networks.
- CoFHE encryption from the browser for candidate/job/match inputs.
- On-chain candidate profile creation.
- On-chain job posting.
- On-chain proof submission and verification.
- On-chain encrypted match computation.
- Local authorized decryption of encrypted score, salary overlap, and qualification flag.
- Shortlist, reveal request, and candidate-approved reveal flow.
- Event-indexed ledgers with counter fallback for RPCs that cannot serve logs.
- Candidate-side job discovery and one-click private match requests.
- Anonymous assessment submissions and verifier assessment approval.
- Privacy-preserving reputation signals from trusted verifiers.
- Trusted AI/oracle match creation with oracle report hashes recorded on-chain.
- Verifier governance proposals with multi-approval execution.
- Candidate profile update/archive and recruiter job update/close flows.
- Role-aware wallet status, RPC health checks, event notifications, and decoded transaction errors.
- Production guards for duplicate identity commitments, duplicate proof hashes, duplicate matches and match requests, repeat proof/assessment verification, invalid verifiers, closed jobs, and repeat reveal actions.
- Reveal approval verifies the identity metadata and secret against the candidate's original identity commitment.
- Encrypted candidate, job, and AI score inputs are bounded on-chain before matching.
- New candidate, job, proof, assessment, reveal, and reputation metadata can be pinned to IPFS through the server-side Pinata route.
- IPFS and Arweave metadata URIs resolve through the configured metadata gateway when loaded by the UI.
- GitHub Actions CI runs the full production validation suite on pushes and pull requests.
- Hardhat tests for the full private hiring flow and access-control edge cases.

## App Pages

- `/` - animated product entry
- `/candidate` - candidate dashboard
- `/candidate/profile` - create encrypted anonymous profile
- `/candidate/proofs` - upload candidate skill proofs
- `/candidate/assessments` - submit anonymous work-sample assessments
- `/candidate/jobs` - discover open jobs and request private matches
- `/candidate/reveal` - approve selective identity reveal
- `/recruiter` - recruiter dashboard
- `/recruiter/jobs` - post encrypted job
- `/recruiter/matching` - compute private matches and decrypt authorized output
- `/recruiter/decisions` - shortlist and request reveal
- `/matches` - inspect private match records
- `/verifier` - verify skill proofs and manage trusted verifiers
- `/roadmap` - architecture and roadmap overview

## Smart Contract

Main contract: `contracts/BlindHire.sol`

Core functions:

- `createCandidate`
- `postJob`
- `addSkillProof`
- `verifySkillProof`
- `submitAssessment`
- `verifyAssessment`
- `recordReputationSignal`
- `requestMatch`
- `createMatch`
- `createMatchWithOracleSignal`
- `shortlistMatch`
- `requestReveal`
- `approveReveal`
- `closeJob`
- `updateCandidateProfile`
- `deactivateCandidate`
- `updateJobMetadata`
- `setVerifier`
- `proposeVerifier`
- `approveVerifierProposal`
- `setAiOracle`

Encrypted values use CoFHE `InEuint32`, `euint32`, and `ebool`. The contract uses `FHE.allowThis` and `FHE.allow` so the contract, candidate, and recruiter can access the encrypted handles they are supposed to use.

Current Sepolia deployment:

```bash
NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS=0xe0c76dA5c18F3d4d537dC94411E65713e900c376
NEXT_PUBLIC_BLINDHIRE_DEPLOY_BLOCK=10932835
```

## Tech Stack

- Next.js
- React
- Tailwind CSS
- Three.js / React Three Fiber
- viem
- CoFHE SDK
- Hardhat
- Fhenix CoFHE contracts
- OpenZeppelin contracts

## Environment

Create `.env.local` for the frontend:

```bash
NEXT_PUBLIC_BLINDHIRE_CHAIN=eth-sepolia
NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS=0xYourDeployedContract
NEXT_PUBLIC_BLINDHIRE_DEPLOY_BLOCK=12345678
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_METADATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
```

Set server-only metadata pinning for local development and Vercel:

```bash
PINATA_JWT=your-pinata-jwt
```

Or use the Pinata API key/secret pair:

```bash
PINATA_API_KEY=your-pinata-api-key
PINATA_API_SECRET=your-pinata-api-secret
```

Pinata credentials are used only by `/api/metadata/pin`; never rename them to `NEXT_PUBLIC_*`. The OpenAI key is not required by the current app.

Use shell variables for contract deployment and seeding:

```bash
PRIVATE_KEY=0xYourTestnetPrivateKey
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

Hardhat scripts read `.env.local` and `.env` too, while shell variables still take precedence.
Never commit real private keys or API tokens. Local env files and common credential dump files are ignored by `.gitignore`; keep `.env.example` as the only committed env template.

## Commands

```bash
npm install
npm run compile:contracts
npm run test:contracts
npm run typecheck
npm run lint
npm run build
npm run validate:prod
npm run dev
```

Deploy to Sepolia:

```bash
npm run deploy:sepolia
```

Seed a demo candidate, proof, job, and match:

```bash
npm run seed:sepolia
```

Set `DEMO_SEED=some-unique-label` when you want reproducible seeded metadata. Without it, the script uses a timestamp so duplicate proof and identity guards do not block repeat demos.

Smoke test a deployed Sepolia contract:

```bash
npm run smoke:sepolia
```

## Demo Flow

1. Candidate connects wallet and creates an anonymous encrypted profile.
2. Candidate uploads a skill proof.
3. Verifier verifies the proof.
4. Recruiter posts a job with encrypted requirements.
5. Candidate requests a private match for that job.
6. Recruiter computes a private match.
7. Recruiter decrypts the authorized match result locally.
8. Recruiter shortlists and requests identity reveal.
9. Candidate approves reveal.
10. Recruiter sees the selected identity metadata.

## Wave 5 Production Readiness

Wave 5 is implemented in this repo.

- Production validation is available through `npm run validate:prod` and `npm run smoke:sepolia`.
- Dependencies are pinned and high-severity audit findings were removed with overrides where compatible.
- UI reads candidate, job, match, and match-request IDs from contract events with counter fallback.
- Larger documents can be represented by IPFS or Arweave URIs while hashes are anchored on-chain for proofs, assessments, and reputation signals. HTTPS references are embedded in JSON metadata instead of treated as immutable content-addressed storage.
- Trusted AI/oracle matching is supported through `createMatchWithOracleSignal`.
- Recruiter and oracle match creation require a prior candidate match request.
- Role UX, RPC health, decoded errors, search/filtering, and event notifications are live in the app.
- `npm run smoke:sepolia` verifies chain ID, contract reads, and exact deployed bytecode parity with the compiled local artifact.
- Anonymous assessments, verifier governance, reputation history, candidate job discovery, one-click match requests, and update/archive flows are implemented.
- Security review notes live in `SECURITY_REVIEW.md`.

Final Wave 5 verification completed on May 27, 2026:

- `npm run validate:prod` passed: contract compile, Hardhat tests, TypeScript, ESLint, and Next production build.
- `npm run smoke:sepolia` passed against `0xe0c76dA5c18F3d4d537dC94411E65713e900c376` with exact bytecode parity.
- Sepolia demo seed completed one full on-chain flow: candidate, proof, assessment, reputation signal, job, match request, oracle match, shortlist, reveal request, and candidate reveal approval.
- Curl checks returned `200` for all local production routes: `/`, candidate pages, recruiter pages, `/matches`, `/verifier`, and `/roadmap`.
- Raw Sepolia RPC curl checks returned `candidateCount=1`, `jobCount=1`, and `matchCount=1` for the current contract.

Remaining production assumptions:

- Move ownership to a multisig before handling real candidates.
- Use a dedicated RPC provider for production.
- Add an external paymaster if gas sponsorship becomes required.
- Keep private keys out of repo files and CI logs.

## Long-Term Ideas

- Blind salary negotiation where both sides prove salary overlap without revealing exact numbers.
- Anonymous technical interviews with text-only or voice-masked evaluation.
- Private resume analyzer that summarizes experience without exposing the raw resume publicly.
- Skill badges or encrypted credentials for verified achievements.
- Global talent discovery that reduces location and school-name bias.
- DAO contributor reputation for Web3-native hiring.
- Fraud detection for fake certificates, copied portfolios, and suspicious proof patterns.
