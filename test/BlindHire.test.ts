import hre from "hardhat";
import { expect } from "chai";
import { Encryptable, FheTypes, type CofheClient } from "@cofhe/sdk";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

type TxResponse = {
  wait: () => Promise<unknown>;
};

type TxMethod = (...args: unknown[]) => Promise<TxResponse>;

type CandidateView = {
  anonymousProfileURI: string;
  skillScoreHandle: `0x${string}`;
  experienceYearsHandle: `0x${string}`;
  salaryMinHandle: `0x${string}`;
  salaryMaxHandle: `0x${string}`;
  verifiedProofs: bigint;
  active: boolean;
  assessmentCount: bigint;
  reputationScore: bigint;
};

type MatchView = {
  encryptedScoreHandle: `0x${string}`;
  salaryOverlapHandle: `0x${string}`;
  qualifiedHandle: `0x${string}`;
  shortlisted: boolean;
  revealRequested: boolean;
  revealApproved: boolean;
  revealedIdentityURI: string;
};

type MatchRequestView = {
  requester: string;
  fulfilled: boolean;
};

type MatchAuditView = {
  oracle: string;
  oracleReportHash: string;
};

type VerifierProposalView = {
  approvals: bigint;
  executed: boolean;
};

type BlindHireContract = {
  waitForDeployment: () => Promise<unknown>;
  connect: (signer: HardhatEthersSigner) => BlindHireContract;
  setVerifier: TxMethod;
  createCandidate: TxMethod;
  updateCandidateProfile: TxMethod;
  deactivateCandidate: TxMethod;
  postJob: TxMethod;
  updateJobMetadata: TxMethod;
  closeJob: TxMethod;
  addSkillProof: TxMethod;
  verifySkillProof: TxMethod;
  submitAssessment: TxMethod;
  verifyAssessment: TxMethod;
  recordReputationSignal: TxMethod;
  requestMatch: TxMethod;
  createMatch: TxMethod;
  createMatchWithOracleSignal: TxMethod;
  shortlistMatch: TxMethod;
  requestReveal: TxMethod;
  approveReveal: TxMethod;
  proposeVerifier: TxMethod;
  approveVerifierProposal: TxMethod;
  getCandidate: (candidateId: number | bigint) => Promise<CandidateView>;
  getMatch: (matchId: number | bigint) => Promise<MatchView>;
  getMatchRequest: (requestId: number | bigint) => Promise<MatchRequestView>;
  getMatchAudit: (matchId: number | bigint) => Promise<MatchAuditView>;
  getVerifierProposal: (proposalId: number | bigint) => Promise<VerifierProposalView>;
  identityCommitmentUsed: (commitment: string) => Promise<boolean>;
  trustedVerifiers: (verifier: string) => Promise<boolean>;
};

describe("BlindHire", () => {
  let owner: HardhatEthersSigner;
  let other: HardhatEthersSigner;
  let candidate: HardhatEthersSigner;
  let recruiter: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;
  let ownerClient: CofheClient;
  let candidateClient: CofheClient;
  let recruiterClient: CofheClient;
  const defaultIdentityURI = "ipfs://identity/rahul-contact-portfolio";

  before(async () => {
    [owner, candidate, recruiter, verifier, other] = await hre.ethers.getSigners();
    ownerClient = await hre.cofhe.createClientWithBatteries(owner);
    candidateClient = await hre.cofhe.createClientWithBatteries(candidate);
    recruiterClient = await hre.cofhe.createClientWithBatteries(recruiter);
  });

  async function deployBlindHire() {
    const BlindHire = await hre.ethers.getContractFactory("BlindHire");
    const blindHire = (await BlindHire.deploy()) as unknown as BlindHireContract;
    await blindHire.waitForDeployment();
    await (await blindHire.setVerifier(verifier.address, true)).wait();
    return blindHire;
  }

  async function encryptedCandidateInputs(client = candidateClient) {
    return client
      .encryptInputs([
        Encryptable.uint32(92n),
        Encryptable.uint32(5n),
        Encryptable.uint32(130_000n),
        Encryptable.uint32(170_000n),
      ])
      .execute();
  }

  async function encryptedJobInputs(client = recruiterClient) {
    return client
      .encryptInputs([
        Encryptable.uint32(85n),
        Encryptable.uint32(4n),
        Encryptable.uint32(125_000n),
        Encryptable.uint32(175_000n),
      ])
      .execute();
  }

  async function expectCustomError(action: Promise<unknown>, errorName: string) {
    try {
      await action;
      expect.fail(`Expected ${errorName}`);
    } catch (error) {
      expect(String(error)).to.include(errorName);
    }
  }

  function identityReveal(seed = "candidate-secret-commitment", identityURI = defaultIdentityURI) {
    const identitySalt = hre.ethers.id(seed);
    return {
      identityURI,
      identitySalt,
      identityCommitment: hre.ethers.solidityPackedKeccak256(["string", "bytes32"], [identityURI, identitySalt]),
    };
  }

  async function createCandidateProfile(blindHire: BlindHireContract, commitmentSeed = "candidate-secret-commitment") {
    const inputs = await encryptedCandidateInputs();
    const identity = identityReveal(commitmentSeed);
    await (
      await blindHire
        .connect(candidate)
        .createCandidate(
          "ipfs://anonymous-react-defi-engineer",
          identity.identityCommitment,
          inputs[0],
          inputs[1],
          inputs[2],
          inputs[3],
        )
    ).wait();
    return identity;
  }

  async function postRecruiterJob(blindHire: BlindHireContract) {
    const inputs = await encryptedJobInputs();
    await (
      await blindHire
        .connect(recruiter)
        .postJob(
          "ipfs://jobs/senior-frontend-protocol-engineer",
          inputs[0],
          inputs[1],
          inputs[2],
          inputs[3],
        )
    ).wait();
  }

  it("runs the private hiring flow end to end", async () => {
    const blindHire = await deployBlindHire();
    const identity = await createCandidateProfile(blindHire);

    await (
      await blindHire
        .connect(candidate)
        .addSkillProof(1, "ipfs://proof/github-defi-audit", hre.ethers.id("proof-github-defi-audit"))
    ).wait();

    await (await blindHire.connect(verifier).verifySkillProof(1, 0)).wait();

    await postRecruiterJob(blindHire);

    const aiSignal = await recruiterClient.encryptInputs([Encryptable.uint32(94n)]).execute();
    await (await blindHire.connect(candidate).requestMatch(1, 1)).wait();
    await (await blindHire.connect(recruiter).createMatch(1, 1, aiSignal[0])).wait();

    const matchBeforeReveal = await blindHire.getMatch(1);
    expect(matchBeforeReveal.shortlisted).to.equal(false);
    expect(matchBeforeReveal.revealApproved).to.equal(false);

    const decryptedScore = await recruiterClient
      .decryptForView(matchBeforeReveal.encryptedScoreHandle, FheTypes.Uint32)
      .execute();
    const salaryOverlap = await recruiterClient
      .decryptForView(matchBeforeReveal.salaryOverlapHandle, FheTypes.Bool)
      .execute();
    const qualified = await recruiterClient
      .decryptForView(matchBeforeReveal.qualifiedHandle, FheTypes.Bool)
      .execute();

    expect(decryptedScore).to.equal(97n);
    expect(salaryOverlap).to.equal(true);
    expect(qualified).to.equal(true);

    await (await blindHire.connect(recruiter).shortlistMatch(1)).wait();
    await (await blindHire.connect(recruiter).requestReveal(1)).wait();
    await (await blindHire.connect(candidate).approveReveal(1, identity.identityURI, identity.identitySalt)).wait();

    const matchAfterReveal = await blindHire.getMatch(1);
    expect(matchAfterReveal.shortlisted).to.equal(true);
    expect(matchAfterReveal.revealRequested).to.equal(true);
    expect(matchAfterReveal.revealApproved).to.equal(true);
    expect(matchAfterReveal.revealedIdentityURI).to.equal(identity.identityURI);

    const candidateView = await blindHire.getCandidate(1);
    const revealedSkillScore = await recruiterClient
      .decryptForView(candidateView.skillScoreHandle, FheTypes.Uint32)
      .execute();

    expect(candidateView.verifiedProofs).to.equal(1n);
    expect(revealedSkillScore).to.equal(92n);
  });

  it("bounds encrypted user inputs before matching", async () => {
    const blindHire = await deployBlindHire();
    const identity = identityReveal("bounded-candidate");
    const oversizedCandidateInputs = await candidateClient
      .encryptInputs([
        Encryptable.uint32(250n),
        Encryptable.uint32(120n),
        Encryptable.uint32(170_000n),
        Encryptable.uint32(130_000n),
      ])
      .execute();
    await (
      await blindHire
        .connect(candidate)
        .createCandidate(
          "ipfs://anonymous-bounded-candidate",
          identity.identityCommitment,
          oversizedCandidateInputs[0],
          oversizedCandidateInputs[1],
          oversizedCandidateInputs[2],
          oversizedCandidateInputs[3],
        )
    ).wait();

    const oversizedJobInputs = await recruiterClient
      .encryptInputs([
        Encryptable.uint32(250n),
        Encryptable.uint32(120n),
        Encryptable.uint32(20_000_000n),
        Encryptable.uint32(1n),
      ])
      .execute();
    await (
      await blindHire
        .connect(recruiter)
        .postJob(
          "ipfs://jobs/bounded-role",
          oversizedJobInputs[0],
          oversizedJobInputs[1],
          oversizedJobInputs[2],
          oversizedJobInputs[3],
        )
    ).wait();

    const boundedCandidate = await blindHire.getCandidate(1);
    expect(
      await candidateClient.decryptForView(boundedCandidate.skillScoreHandle, FheTypes.Uint32).execute(),
    ).to.equal(100n);
    expect(
      await candidateClient.decryptForView(boundedCandidate.salaryMinHandle, FheTypes.Uint32).execute(),
    ).to.equal(130_000n);
    expect(
      await candidateClient.decryptForView(boundedCandidate.salaryMaxHandle, FheTypes.Uint32).execute(),
    ).to.equal(170_000n);

    await (await blindHire.connect(candidate).requestMatch(1, 1)).wait();
    const oversizedAiSignal = await recruiterClient.encryptInputs([Encryptable.uint32(500n)]).execute();
    await (await blindHire.connect(recruiter).createMatch(1, 1, oversizedAiSignal[0])).wait();
    const boundedMatch = await blindHire.getMatch(1);
    expect(
      await recruiterClient.decryptForView(boundedMatch.encryptedScoreHandle, FheTypes.Uint32).execute(),
    ).to.equal(95n);
  });

  it("enforces production guards and access controls", async () => {
    const blindHire = await deployBlindHire();
    const candidateInputs = await encryptedCandidateInputs();

    await expectCustomError(
      blindHire
        .connect(candidate)
        .createCandidate(
          "ipfs://anonymous-react-defi-engineer",
          hre.ethers.ZeroHash,
          candidateInputs[0],
          candidateInputs[1],
          candidateInputs[2],
          candidateInputs[3],
        ),
      "InvalidIdentityCommitment",
    );

    const identity = await createCandidateProfile(blindHire, "candidate-unique-commitment");
    expect(await blindHire.identityCommitmentUsed(identity.identityCommitment)).to.equal(true);

    const duplicateInputs = await encryptedCandidateInputs();
    await expectCustomError(
      blindHire
        .connect(candidate)
        .createCandidate(
          "ipfs://duplicate-profile",
          identity.identityCommitment,
          duplicateInputs[0],
          duplicateInputs[1],
          duplicateInputs[2],
          duplicateInputs[3],
        ),
      "IdentityCommitmentUsed",
    );

    await expectCustomError(
      blindHire.connect(candidate).addSkillProof(1, "ipfs://proof/empty-hash", hre.ethers.ZeroHash),
      "InvalidProofHash",
    );

    await (
      await blindHire
        .connect(candidate)
        .addSkillProof(1, "ipfs://proof/github-defi-audit", hre.ethers.id("proof-github-defi-audit"))
    ).wait();

    await expectCustomError(
      blindHire
        .connect(candidate)
        .addSkillProof(1, "ipfs://proof/github-defi-audit-copy", hre.ethers.id("proof-github-defi-audit")),
      "DuplicateProof",
    );

    await expectCustomError(blindHire.connect(other).verifySkillProof(1, 0), "NotTrustedVerifier");
    await (await blindHire.connect(verifier).verifySkillProof(1, 0)).wait();
    await expectCustomError(blindHire.connect(verifier).verifySkillProof(1, 0), "ProofAlreadyVerified");

    await postRecruiterJob(blindHire);
    const aiSignal = await recruiterClient.encryptInputs([Encryptable.uint32(94n)]).execute();

    await expectCustomError(blindHire.connect(candidate).createMatch(1, 1, aiSignal[0]), "NotRecruiter");
    await expectCustomError(blindHire.connect(recruiter).createMatch(1, 1, aiSignal[0]), "MatchRequestNotFound");
    await (await blindHire.connect(candidate).requestMatch(1, 1)).wait();
    await (await blindHire.connect(recruiter).createMatch(1, 1, aiSignal[0])).wait();
    const duplicateAiSignal = await recruiterClient.encryptInputs([Encryptable.uint32(94n)]).execute();
    await expectCustomError(blindHire.connect(recruiter).createMatch(1, 1, duplicateAiSignal[0]), "DuplicateMatch");

    await (await blindHire.connect(recruiter).requestReveal(1)).wait();
    await expectCustomError(blindHire.connect(recruiter).requestReveal(1), "RevealAlreadyRequested");
    await expectCustomError(
      blindHire.connect(candidate).approveReveal(1, "ipfs://identity/rewritten", identity.identitySalt),
      "InvalidIdentityReveal",
    );
    await (await blindHire.connect(candidate).approveReveal(1, identity.identityURI, identity.identitySalt)).wait();
    await expectCustomError(
      blindHire.connect(candidate).approveReveal(1, identity.identityURI, identity.identitySalt),
      "RevealAlreadyApproved",
    );

    await postRecruiterJob(blindHire);
    await (await blindHire.connect(recruiter).closeJob(2)).wait();
    await expectCustomError(blindHire.connect(recruiter).closeJob(2), "JobIsClosed");
    await expectCustomError(blindHire.connect(recruiter).updateJobMetadata(2, "ipfs://jobs/closed-update"), "JobIsClosed");
    const closedJobSignal = await recruiterClient.encryptInputs([Encryptable.uint32(90n)]).execute();
    await expectCustomError(blindHire.connect(recruiter).createMatch(1, 2, closedJobSignal[0]), "JobIsClosed");
  });

  it("supports Wave 5 lifecycle, oracle, assessment, reputation, and verifier governance flows", async () => {
    const blindHire = await deployBlindHire();
    await createCandidateProfile(blindHire, "wave-five-candidate");
    await postRecruiterJob(blindHire);

    await (
      await blindHire
        .connect(candidate)
        .updateCandidateProfile(1, "ipfs://profiles/wave-five-updated")
    ).wait();
    let candidateView = await blindHire.getCandidate(1);
    expect(candidateView.anonymousProfileURI).to.equal("ipfs://profiles/wave-five-updated");
    expect(candidateView.active).to.equal(true);

    await (
      await blindHire
        .connect(candidate)
        .submitAssessment(1, "ipfs://assessment/blind-work-sample", hre.ethers.id("assessment-wave-five"))
    ).wait();
    await (await blindHire.connect(verifier).verifyAssessment(1, 0)).wait();
    await expectCustomError(blindHire.connect(verifier).verifyAssessment(1, 0), "AssessmentAlreadyVerified");
    await (
      await blindHire
        .connect(verifier)
        .recordReputationSignal(1, "ipfs://reputation/production-contribution", hre.ethers.id("rep-wave-five"), 25)
    ).wait();

    candidateView = await blindHire.getCandidate(1);
    expect(candidateView.assessmentCount).to.equal(1n);
    expect(candidateView.reputationScore).to.equal(45n);

    const unsolicitedOracleSignal = await ownerClient.encryptInputs([Encryptable.uint32(88n)]).execute();
    await expectCustomError(
      blindHire
        .connect(owner)
        .createMatchWithOracleSignal(1, 1, unsolicitedOracleSignal[0], hre.ethers.id("oracle-report-without-request")),
      "MatchRequestNotFound",
    );

    await (await blindHire.connect(candidate).requestMatch(1, 1)).wait();
    let request = await blindHire.getMatchRequest(1);
    expect(request.requester).to.equal(candidate.address);
    expect(request.fulfilled).to.equal(false);

    const oracleSignal = await ownerClient.encryptInputs([Encryptable.uint32(90n)]).execute();
    await expectCustomError(
      blindHire.connect(other).createMatchWithOracleSignal(1, 1, oracleSignal[0], hre.ethers.id("oracle-report-denied")),
      "NotTrustedAiOracle",
    );

    await (
      await blindHire
        .connect(owner)
        .createMatchWithOracleSignal(1, 1, oracleSignal[0], hre.ethers.id("oracle-report-wave-five"))
    ).wait();

    request = await blindHire.getMatchRequest(1);
    expect(request.fulfilled).to.equal(true);
    const audit = await blindHire.getMatchAudit(1);
    expect(audit.oracle).to.equal(owner.address);
    expect(audit.oracleReportHash).to.equal(hre.ethers.id("oracle-report-wave-five"));

    await (await blindHire.connect(owner).proposeVerifier(other.address)).wait();
    let proposal = await blindHire.getVerifierProposal(1);
    expect(proposal.approvals).to.equal(1n);
    expect(proposal.executed).to.equal(false);
    await (await blindHire.connect(verifier).approveVerifierProposal(1)).wait();
    proposal = await blindHire.getVerifierProposal(1);
    expect(proposal.executed).to.equal(true);
    expect(await blindHire.trustedVerifiers(other.address)).to.equal(true);

    await (await blindHire.connect(candidate).deactivateCandidate(1)).wait();
    candidateView = await blindHire.getCandidate(1);
    expect(candidateView.active).to.equal(false);
    await expectCustomError(
      blindHire.connect(candidate).addSkillProof(1, "ipfs://proof/inactive", hre.ethers.id("inactive-proof")),
      "CandidateInactive",
    );
    await expectCustomError(blindHire.connect(verifier).verifyAssessment(1, 0), "CandidateInactive");
    await expectCustomError(
      blindHire
        .connect(verifier)
        .recordReputationSignal(1, "ipfs://reputation/inactive", hre.ethers.id("rep-inactive"), 10),
      "CandidateInactive",
    );
  });
});
