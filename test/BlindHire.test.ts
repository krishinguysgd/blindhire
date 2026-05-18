import hre from "hardhat";
import { expect } from "chai";
import { Encryptable, FheTypes, type CofheClient } from "@cofhe/sdk";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BlindHire", () => {
  let other: HardhatEthersSigner;
  let candidate: HardhatEthersSigner;
  let recruiter: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;
  let otherClient: CofheClient;
  let candidateClient: CofheClient;
  let recruiterClient: CofheClient;

  before(async () => {
    [, candidate, recruiter, verifier, other] = await hre.ethers.getSigners();
    otherClient = await hre.cofhe.createClientWithBatteries(other);
    candidateClient = await hre.cofhe.createClientWithBatteries(candidate);
    recruiterClient = await hre.cofhe.createClientWithBatteries(recruiter);
  });

  async function deployBlindHire() {
    const BlindHire = await hre.ethers.getContractFactory("BlindHire");
    const blindHire = (await BlindHire.deploy()) as any;
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

  async function createCandidateProfile(blindHire: any, commitment = "candidate-secret-commitment") {
    const inputs = await encryptedCandidateInputs();
    await (
      await blindHire
        .connect(candidate)
        .createCandidate(
          "ipfs://anonymous-react-defi-engineer",
          hre.ethers.id(commitment),
          inputs[0],
          inputs[1],
          inputs[2],
          inputs[3],
        )
    ).wait();
  }

  async function postRecruiterJob(blindHire: any) {
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
    await createCandidateProfile(blindHire);

    await (
      await blindHire
        .connect(candidate)
        .addSkillProof(1, "ipfs://proof/github-defi-audit", hre.ethers.id("proof-github-defi-audit"))
    ).wait();

    await (await blindHire.connect(verifier).verifySkillProof(1, 0)).wait();

    await postRecruiterJob(blindHire);

    const aiSignal = await recruiterClient.encryptInputs([Encryptable.uint32(94n)]).execute();
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
    await (await blindHire.connect(candidate).approveReveal(1, "ipfs://identity/rahul-contact-portfolio")).wait();

    const matchAfterReveal = await blindHire.getMatch(1);
    expect(matchAfterReveal.shortlisted).to.equal(true);
    expect(matchAfterReveal.revealRequested).to.equal(true);
    expect(matchAfterReveal.revealApproved).to.equal(true);
    expect(matchAfterReveal.revealedIdentityURI).to.equal("ipfs://identity/rahul-contact-portfolio");

    const candidateView = await blindHire.getCandidate(1);
    const revealedSkillScore = await recruiterClient
      .decryptForView(candidateView.skillScoreHandle, FheTypes.Uint32)
      .execute();

    expect(candidateView.verifiedProofs).to.equal(1n);
    expect(revealedSkillScore).to.equal(92n);
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

    await createCandidateProfile(blindHire, "candidate-unique-commitment");
    expect(await blindHire.identityCommitmentUsed(hre.ethers.id("candidate-unique-commitment"))).to.equal(true);

    const duplicateInputs = await encryptedCandidateInputs();
    await expectCustomError(
      blindHire
        .connect(candidate)
        .createCandidate(
          "ipfs://duplicate-profile",
          hre.ethers.id("candidate-unique-commitment"),
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

    await postRecruiterJob(blindHire);
    const aiSignal = await recruiterClient.encryptInputs([Encryptable.uint32(94n)]).execute();

    await expectCustomError(blindHire.connect(candidate).createMatch(1, 1, aiSignal[0]), "NotRecruiter");
    await (await blindHire.connect(recruiter).createMatch(1, 1, aiSignal[0])).wait();
    const duplicateAiSignal = await recruiterClient.encryptInputs([Encryptable.uint32(94n)]).execute();
    await expectCustomError(blindHire.connect(recruiter).createMatch(1, 1, duplicateAiSignal[0]), "DuplicateMatch");

    await (await blindHire.connect(recruiter).requestReveal(1)).wait();
    await expectCustomError(blindHire.connect(recruiter).requestReveal(1), "RevealAlreadyRequested");
    await (await blindHire.connect(candidate).approveReveal(1, "ipfs://identity/rahul-contact-portfolio")).wait();
    await expectCustomError(
      blindHire.connect(candidate).approveReveal(1, "ipfs://identity/rewritten"),
      "RevealAlreadyApproved",
    );

    await postRecruiterJob(blindHire);
    await (await blindHire.connect(recruiter).closeJob(2)).wait();
    const closedJobSignal = await recruiterClient.encryptInputs([Encryptable.uint32(90n)]).execute();
    await expectCustomError(blindHire.connect(recruiter).createMatch(1, 2, closedJobSignal[0]), "JobIsClosed");
  });
});
