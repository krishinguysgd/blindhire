import { parseAbi, type Address } from "viem";

const encryptedInputAbi =
  "(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature)";

export const blindHireAbi = parseAbi([
  "event CandidateCreated(uint256 indexed candidateId, address indexed owner, string anonymousProfileURI)",
  "event CandidateProfileUpdated(uint256 indexed candidateId, address indexed owner, string anonymousProfileURI)",
  "event CandidateDeactivated(uint256 indexed candidateId, address indexed owner)",
  "event JobPosted(uint256 indexed jobId, address indexed recruiter, string jobURI)",
  "event JobUpdated(uint256 indexed jobId, address indexed recruiter, string jobURI)",
  "event SkillProofAdded(uint256 indexed candidateId, uint256 indexed proofIndex, bytes32 proofHash)",
  "event SkillProofVerified(uint256 indexed candidateId, uint256 indexed proofIndex, address indexed verifier)",
  "event AssessmentSubmitted(uint256 indexed candidateId, uint256 indexed assessmentIndex, bytes32 assessmentHash)",
  "event AssessmentVerified(uint256 indexed candidateId, uint256 indexed assessmentIndex, address indexed verifier)",
  "event ReputationSignalRecorded(uint256 indexed candidateId, uint256 indexed signalIndex, address indexed issuer, uint64 weight, bytes32 signalHash)",
  "event MatchRequested(uint256 indexed requestId, uint256 indexed candidateId, uint256 indexed jobId, address requester)",
  "event MatchCreated(uint256 indexed matchId, uint256 indexed candidateId, uint256 indexed jobId, bytes32 encryptedScoreHandle, bytes32 salaryOverlapHandle, bytes32 qualifiedHandle)",
  "event MatchShortlisted(uint256 indexed matchId, address indexed recruiter)",
  "event RevealRequested(uint256 indexed matchId, address indexed recruiter)",
  "event RevealApproved(uint256 indexed matchId, address indexed candidate, string identityURI)",
  "event JobClosed(uint256 indexed jobId)",
  "event VerifierUpdated(address indexed verifier, bool trusted)",
  "event VerifierProposalCreated(uint256 indexed proposalId, address indexed proposer, address indexed verifier)",
  "event VerifierProposalApproved(uint256 indexed proposalId, address indexed approver, uint256 approvals)",
  "event VerifierApprovalThresholdUpdated(uint256 threshold)",
  "event AiOracleUpdated(address indexed oracle, bool trusted)",
  "error CandidateNotFound()",
  "error JobNotFound()",
  "error MatchNotFound()",
  "error MatchRequestNotFound()",
  "error ProofNotFound()",
  "error AssessmentNotFound()",
  "error ReputationSignalNotFound()",
  "error VerifierProposalNotFound()",
  "error NotCandidateOwner()",
  "error NotRecruiter()",
  "error NotTrustedVerifier()",
  "error NotTrustedAiOracle()",
  "error DuplicateMatch()",
  "error DuplicateMatchRequest()",
  "error DuplicateProof()",
  "error DuplicateAssessment()",
  "error DuplicateReputationSignal()",
  "error ProofAlreadyVerified()",
  "error AssessmentAlreadyVerified()",
  "error IdentityCommitmentUsed()",
  "error InvalidIdentityCommitment()",
  "error InvalidProofHash()",
  "error InvalidAssessmentHash()",
  "error InvalidReputationHash()",
  "error InvalidOracleReport()",
  "error InvalidVerifier()",
  "error InvalidWeight()",
  "error InvalidThreshold()",
  "error CandidateInactive()",
  "error JobIsClosed()",
  "error RevealAlreadyApproved()",
  "error RevealAlreadyRequested()",
  "error RevealNotRequested()",
  "error InvalidIdentityReveal()",
  "error VerifierAlreadyTrusted()",
  "error VerifierProposalAlreadyApproved()",
  "error VerifierProposalExecuted()",
  "error EmptyURI()",
  "function candidateCount() view returns (uint256)",
  "function jobCount() view returns (uint256)",
  "function matchCount() view returns (uint256)",
  "function matchRequestCount() view returns (uint256)",
  "function verifierProposalCount() view returns (uint256)",
  "function verifierApprovalThreshold() view returns (uint256)",
  "function MAX_SCORE() view returns (uint256)",
  "function MAX_EXPERIENCE_YEARS() view returns (uint256)",
  "function MAX_SALARY() view returns (uint256)",
  "function owner() view returns (address)",
  "function trustedVerifiers(address verifier) view returns (bool)",
  "function trustedAiOracles(address oracle) view returns (bool)",
  "function identityCommitmentUsed(bytes32 identityCommitment) view returns (bool)",
  "function proofHashUsed(bytes32 proofHash) view returns (bool)",
  "function assessmentHashUsed(bytes32 assessmentHash) view returns (bool)",
  "function reputationHashUsed(bytes32 reputationHash) view returns (bool)",
  "function matchIdByPair(bytes32 pairKey) view returns (uint256)",
  "function matchRequestIdByPair(bytes32 pairKey) view returns (uint256)",
  `function createCandidate(string anonymousProfileURI, bytes32 identityCommitment, ${encryptedInputAbi} skillScore, ${encryptedInputAbi} experienceYears, ${encryptedInputAbi} salaryMin, ${encryptedInputAbi} salaryMax) returns (uint256)`,
  "function updateCandidateProfile(uint256 candidateId, string anonymousProfileURI)",
  "function deactivateCandidate(uint256 candidateId)",
  `function postJob(string jobURI, ${encryptedInputAbi} requiredSkillScore, ${encryptedInputAbi} minExperienceYears, ${encryptedInputAbi} salaryMin, ${encryptedInputAbi} salaryMax) returns (uint256)`,
  "function updateJobMetadata(uint256 jobId, string jobURI)",
  "function addSkillProof(uint256 candidateId, string proofURI, bytes32 proofHash) returns (uint256)",
  "function verifySkillProof(uint256 candidateId, uint256 proofIndex)",
  "function submitAssessment(uint256 candidateId, string assessmentURI, bytes32 assessmentHash) returns (uint256)",
  "function verifyAssessment(uint256 candidateId, uint256 assessmentIndex)",
  "function recordReputationSignal(uint256 candidateId, string signalURI, bytes32 signalHash, uint64 weight) returns (uint256)",
  "function requestMatch(uint256 candidateId, uint256 jobId) returns (uint256)",
  `function createMatch(uint256 candidateId, uint256 jobId, ${encryptedInputAbi} aiSignal) returns (uint256)`,
  `function createMatchWithOracleSignal(uint256 candidateId, uint256 jobId, ${encryptedInputAbi} aiSignal, bytes32 oracleReportHash) returns (uint256)`,
  "function shortlistMatch(uint256 matchId)",
  "function requestReveal(uint256 matchId)",
  "function approveReveal(uint256 matchId, string identityURI, bytes32 identitySalt)",
  "function closeJob(uint256 jobId)",
  "function setVerifier(address verifier, bool trusted)",
  "function setAiOracle(address oracle, bool trusted)",
  "function setVerifierApprovalThreshold(uint256 threshold)",
  "function proposeVerifier(address verifier) returns (uint256)",
  "function approveVerifierProposal(uint256 proposalId)",
  "function getCandidate(uint256 candidateId) view returns (address owner,string anonymousProfileURI,bytes32 identityCommitment,bytes32 skillScoreHandle,bytes32 experienceYearsHandle,bytes32 salaryMinHandle,bytes32 salaryMaxHandle,uint256 proofCount,uint256 verifiedProofs,bool exists,bool active,uint256 assessmentCount,uint256 reputationScore,uint64 updatedAt)",
  "function getJob(uint256 jobId) view returns (address recruiter,string jobURI,bytes32 requiredSkillScoreHandle,bytes32 minExperienceYearsHandle,bytes32 salaryMinHandle,bytes32 salaryMaxHandle,bool open,bool exists,uint64 updatedAt)",
  "function getSkillProof(uint256 candidateId,uint256 proofIndex) view returns (string proofURI,bytes32 proofHash,address verifier,bool verified,uint64 createdAt,uint64 verifiedAt)",
  "function getAssessment(uint256 candidateId,uint256 assessmentIndex) view returns (string assessmentURI,bytes32 assessmentHash,address verifier,bool verified,uint64 createdAt,uint64 verifiedAt)",
  "function getReputationSignal(uint256 candidateId,uint256 signalIndex) view returns (string signalURI,bytes32 signalHash,address issuer,uint64 weight,uint64 createdAt)",
  "function reputationSignalCount(uint256 candidateId) view returns (uint256)",
  "function getMatchRequest(uint256 requestId) view returns (uint256 candidateId,uint256 jobId,address requester,bool fulfilled,uint64 createdAt,bool exists)",
  "function getVerifierProposal(uint256 proposalId) view returns (address proposer,address verifier,uint256 approvals,bool executed,uint64 createdAt,bool exists)",
  "function getMatch(uint256 matchId) view returns (uint256 candidateId,uint256 jobId,bytes32 encryptedScoreHandle,bytes32 salaryOverlapHandle,bytes32 qualifiedHandle,bool shortlisted,bool revealRequested,bool revealApproved,string revealedIdentityURI,bool exists)",
  "function getMatchAudit(uint256 matchId) view returns (address oracle,bytes32 oracleReportHash,uint64 createdAt)",
]);

export const configuredContractAddress =
  process.env.NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS as Address | undefined;

export const configuredChainKey =
  process.env.NEXT_PUBLIC_BLINDHIRE_CHAIN || "eth-sepolia";

export type EncryptedInput = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

export type CandidateRecord = {
  id: bigint;
  owner: Address;
  anonymousProfileURI: string;
  identityCommitment: `0x${string}`;
  skillScoreHandle: `0x${string}`;
  experienceYearsHandle: `0x${string}`;
  salaryMinHandle: `0x${string}`;
  salaryMaxHandle: `0x${string}`;
  proofCount: bigint;
  verifiedProofs: bigint;
  exists: boolean;
  active: boolean;
  assessmentCount: bigint;
  reputationScore: bigint;
  updatedAt: bigint;
};

export type JobRecord = {
  id: bigint;
  recruiter: Address;
  jobURI: string;
  requiredSkillScoreHandle: `0x${string}`;
  minExperienceYearsHandle: `0x${string}`;
  salaryMinHandle: `0x${string}`;
  salaryMaxHandle: `0x${string}`;
  open: boolean;
  exists: boolean;
  updatedAt: bigint;
};

export type MatchRecord = {
  id: bigint;
  candidateId: bigint;
  jobId: bigint;
  encryptedScoreHandle: `0x${string}`;
  salaryOverlapHandle: `0x${string}`;
  qualifiedHandle: `0x${string}`;
  shortlisted: boolean;
  revealRequested: boolean;
  revealApproved: boolean;
  revealedIdentityURI: string;
  exists: boolean;
  oracle?: Address;
  oracleReportHash?: `0x${string}`;
  createdAt?: bigint;
};

export type SkillProofRecord = {
  candidateId: bigint;
  proofIndex: bigint;
  proofURI: string;
  proofHash: `0x${string}`;
  verifier: Address;
  verified: boolean;
  createdAt: bigint;
  verifiedAt: bigint;
};

export type AssessmentRecord = {
  candidateId: bigint;
  assessmentIndex: bigint;
  assessmentURI: string;
  assessmentHash: `0x${string}`;
  verifier: Address;
  verified: boolean;
  createdAt: bigint;
  verifiedAt: bigint;
};

export type ReputationSignalRecord = {
  candidateId: bigint;
  signalIndex: bigint;
  signalURI: string;
  signalHash: `0x${string}`;
  issuer: Address;
  weight: bigint;
  createdAt: bigint;
};

export type MatchRequestRecord = {
  id: bigint;
  candidateId: bigint;
  jobId: bigint;
  requester: Address;
  fulfilled: boolean;
  createdAt: bigint;
  exists: boolean;
};

export type VerifierProposalRecord = {
  id: bigint;
  proposer: Address;
  verifier: Address;
  approvals: bigint;
  executed: boolean;
  createdAt: bigint;
  exists: boolean;
};

export const blindHireErrorMessages: Record<string, string> = {
  CandidateNotFound: "Candidate ID was not found on-chain.",
  JobNotFound: "Job ID was not found on-chain.",
  MatchNotFound: "Match ID was not found on-chain.",
  MatchRequestNotFound: "Match request ID was not found on-chain.",
  ProofNotFound: "Proof index was not found for this candidate.",
  AssessmentNotFound: "Assessment index was not found for this candidate.",
  ReputationSignalNotFound: "Reputation signal was not found.",
  VerifierProposalNotFound: "Verifier proposal was not found.",
  NotCandidateOwner: "Only the candidate wallet can perform this action.",
  NotRecruiter: "Only the recruiter wallet for this job can perform this action.",
  NotTrustedVerifier: "This wallet is not a trusted verifier.",
  NotTrustedAiOracle: "This wallet is not a trusted AI/oracle signer.",
  DuplicateMatch: "This candidate and job already have a match.",
  DuplicateMatchRequest: "This candidate already requested a match for that job.",
  DuplicateProof: "This proof hash has already been submitted.",
  DuplicateAssessment: "This assessment hash has already been submitted.",
  DuplicateReputationSignal: "This reputation signal hash has already been recorded.",
  ProofAlreadyVerified: "This proof has already been verified.",
  AssessmentAlreadyVerified: "This assessment has already been verified.",
  IdentityCommitmentUsed: "This identity commitment has already been used.",
  InvalidIdentityCommitment: "Identity commitment cannot be empty.",
  InvalidProofHash: "Proof hash cannot be empty.",
  InvalidAssessmentHash: "Assessment hash cannot be empty.",
  InvalidReputationHash: "Reputation hash cannot be empty.",
  InvalidOracleReport: "Oracle report hash cannot be empty.",
  InvalidVerifier: "Verifier or oracle address is invalid.",
  InvalidWeight: "Reputation weight must be between 1 and 100.",
  InvalidThreshold: "Verifier approval threshold must be at least 1.",
  CandidateInactive: "This candidate profile has been deactivated.",
  JobIsClosed: "This job is closed.",
  RevealAlreadyApproved: "This reveal has already been approved.",
  RevealAlreadyRequested: "This reveal has already been requested.",
  RevealNotRequested: "The recruiter must request reveal before approval.",
  InvalidIdentityReveal: "Identity metadata and secret do not match the original commitment.",
  VerifierAlreadyTrusted: "That wallet is already a trusted verifier.",
  VerifierProposalAlreadyApproved: "This wallet already approved that verifier proposal.",
  VerifierProposalExecuted: "That verifier proposal has already executed.",
  EmptyURI: "Metadata URI cannot be empty.",
};
