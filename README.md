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
Today this is represented as an encrypted input to the match function. In a later version this can become a dedicated AI/oracle flow that generates private compatibility signals from assessments, resumes, or work samples.

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

6. Recruiter creates a private match.
   The contract computes encrypted skill fit, experience fit, salary overlap, qualification status, and a final encrypted score.

7. Authorized wallets decrypt locally.
   Candidate and recruiter wallets receive FHE access permissions for match outputs. Decryption happens client-side through CoFHE permits.

8. Recruiter requests reveal.
   The candidate identity remains hidden until the recruiter requests reveal and the candidate approves it.

9. Candidate approves identity reveal.
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
- Production guards for duplicate identity commitments, duplicate proof hashes, duplicate matches, invalid verifiers, closed jobs, and repeat reveal actions.
- Hardhat tests for the full private hiring flow and access-control edge cases.

## App Pages

- `/` - animated product entry
- `/candidate` - candidate dashboard
- `/candidate/profile` - create encrypted anonymous profile
- `/candidate/proofs` - upload candidate skill proofs
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
- `createMatch`
- `shortlistMatch`
- `requestReveal`
- `approveReveal`
- `closeJob`
- `setVerifier`

Encrypted values use CoFHE `InEuint32`, `euint32`, and `ebool`. The contract uses `FHE.allowThis` and `FHE.allow` so the contract, candidate, and recruiter can access the encrypted handles they are supposed to use.

Current Sepolia deployment:

```bash
NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS=0xe431d5251a6902C8AF8582B10eaD4f897d4aB98d
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
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

Use shell variables for contract deployment and seeding:

```bash
PRIVATE_KEY=0xYourTestnetPrivateKey
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

Never commit real private keys. `.env*` files are ignored.

## Commands

```bash
npm install
npm run compile:contracts
npm run test:contracts
npx tsc --noEmit
npm run lint
npm run build
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

## Demo Flow

1. Candidate connects wallet and creates an anonymous encrypted profile.
2. Candidate uploads a skill proof.
3. Verifier verifies the proof.
4. Recruiter posts a job with encrypted requirements.
5. Recruiter computes a private match.
6. Recruiter decrypts the authorized match result locally.
7. Recruiter shortlists and requests identity reveal.
8. Candidate approves reveal.
9. Recruiter sees the selected identity metadata.

## coming soon 

These are the issues and missing pieces to handle in the next development wave.

- Finish production Vercel deployment validation with clean package-manager settings, production env sync, and deployed-page browser smoke tests.
- Upgrade and pin framework dependencies after audit review, especially Next.js security patches, without breaking the CoFHE/Three.js flow.
- Add an event indexer so the UI does not loop through `candidateCount`, `jobCount`, and `matchCount` for large ledgers.
- Move larger profile, job, proof, and identity documents to permanent storage such as IPFS, Arweave, or encrypted object storage. Current demo metadata is JSON text.
- Add real AI matching infrastructure. The current encrypted AI signal is manually submitted; Wave 5 should connect a trusted AI/oracle or assessment service.
- Improve role-specific UX so candidate, recruiter, verifier, and owner flows are clearer when different wallets are connected.
- Add better transaction error decoding for duplicate proofs, duplicate matches, closed jobs, unauthorized verifiers, and reveal replay attempts.
- Add notification workflows for reveal requests, verifier review, shortlist events, and candidate approvals.
- Add anonymous assessment modules for coding tests, work samples, and interview scoring.
- Add verifier governance beyond owner-controlled `setVerifier`, such as multi-sig ownership, verifier registry proposals, or reputation-weighted approval.
- Add privacy-preserving reputation history for completed work, endorsements, and DAO contributor records.
- Add recruiter search and filtering over indexed anonymous candidates and jobs.
- Add candidate-side job discovery and one-click match requests where the contract permissions still protect private data.
- Add stronger test coverage: invariant tests, fuzzing for invalid IDs and permission edges, multi-wallet browser tests, and deployed testnet smoke scripts.
- Add formal security review for encrypted access control, reveal lifecycle, metadata leakage, and trusted verifier assumptions.
- Add production monitoring for contract events, failed transactions, RPC health, and frontend runtime errors.
- Add dedicated RPC/provider configuration for production instead of relying on public testnet RPC defaults.
- Add account-abstraction or gas-sponsorship research so candidates can use the app without managing testnet gas.
- Add data deletion and profile update flows with clear limits around what can and cannot be removed from public chain history.

## Long-Term Ideas

- Blind salary negotiation where both sides prove salary overlap without revealing exact numbers.
- Anonymous technical interviews with text-only or voice-masked evaluation.
- Private resume analyzer that summarizes experience without exposing the raw resume publicly.
- Skill badges or encrypted credentials for verified achievements.
- Global talent discovery that reduces location and school-name bias.
- DAO contributor reputation for Web3-native hiring.
- Fraud detection for fake certificates, copied portfolios, and suspicious proof patterns.
