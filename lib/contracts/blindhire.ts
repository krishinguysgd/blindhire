import { parseAbi, type Address } from "viem";

export const blindHireAbi = parseAbi([
  "function candidateCount() view returns (uint256)",
  "function jobCount() view returns (uint256)",
  "function matchCount() view returns (uint256)",
  "function owner() view returns (address)",
  "function trustedVerifiers(address verifier) view returns (bool)",
  "function identityCommitmentUsed(bytes32 identityCommitment) view returns (bool)",
  "function proofHashUsed(bytes32 proofHash) view returns (bool)",
  "function matchIdByPair(bytes32 pairKey) view returns (uint256)",
  "function createCandidate(string anonymousProfileURI, bytes32 identityCommitment, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) skillScore, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) experienceYears, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) salaryMin, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) salaryMax) returns (uint256)",
  "function postJob(string jobURI, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) requiredSkillScore, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) minExperienceYears, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) salaryMin, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) salaryMax) returns (uint256)",
  "function addSkillProof(uint256 candidateId, string proofURI, bytes32 proofHash) returns (uint256)",
  "function verifySkillProof(uint256 candidateId, uint256 proofIndex)",
  "function createMatch(uint256 candidateId, uint256 jobId, (uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) aiSignal) returns (uint256)",
  "function shortlistMatch(uint256 matchId)",
  "function requestReveal(uint256 matchId)",
  "function approveReveal(uint256 matchId, string identityURI)",
  "function closeJob(uint256 jobId)",
  "function setVerifier(address verifier, bool trusted)",
  "function getCandidate(uint256 candidateId) view returns (address owner,string anonymousProfileURI,bytes32 identityCommitment,bytes32 skillScoreHandle,bytes32 experienceYearsHandle,bytes32 salaryMinHandle,bytes32 salaryMaxHandle,uint256 proofCount,uint256 verifiedProofs,bool exists)",
  "function getJob(uint256 jobId) view returns (address recruiter,string jobURI,bytes32 requiredSkillScoreHandle,bytes32 minExperienceYearsHandle,bytes32 salaryMinHandle,bytes32 salaryMaxHandle,bool open,bool exists)",
  "function getSkillProof(uint256 candidateId,uint256 proofIndex) view returns (string proofURI,bytes32 proofHash,address verifier,bool verified,uint64 createdAt,uint64 verifiedAt)",
  "function getMatch(uint256 matchId) view returns (uint256 candidateId,uint256 jobId,bytes32 encryptedScoreHandle,bytes32 salaryOverlapHandle,bytes32 qualifiedHandle,bool shortlisted,bool revealRequested,bool revealApproved,string revealedIdentityURI,bool exists)",
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
