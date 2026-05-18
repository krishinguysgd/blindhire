// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract BlindHire is Ownable {
    struct Candidate {
        address owner;
        string anonymousProfileURI;
        bytes32 identityCommitment;
        euint32 skillScore;
        euint32 experienceYears;
        euint32 salaryMin;
        euint32 salaryMax;
        uint256 proofCount;
        uint256 verifiedProofs;
        bool exists;
    }

    struct Job {
        address recruiter;
        string jobURI;
        euint32 requiredSkillScore;
        euint32 minExperienceYears;
        euint32 salaryMin;
        euint32 salaryMax;
        bool open;
        bool exists;
    }

    struct SkillProof {
        string proofURI;
        bytes32 proofHash;
        address verifier;
        bool verified;
        uint64 createdAt;
        uint64 verifiedAt;
    }

    struct MatchRecord {
        uint256 candidateId;
        uint256 jobId;
        euint32 encryptedScore;
        ebool salaryOverlap;
        ebool qualified;
        bool shortlisted;
        bool revealRequested;
        bool revealApproved;
        string revealedIdentityURI;
        bool exists;
    }

    uint256 public candidateCount;
    uint256 public jobCount;
    uint256 public matchCount;

    mapping(uint256 => Candidate) private candidates;
    mapping(uint256 => Job) private jobs;
    mapping(uint256 => SkillProof[]) private proofsByCandidate;
    mapping(uint256 => MatchRecord) private matchesById;
    mapping(bytes32 => uint256) public matchIdByPair;
    mapping(bytes32 => bool) public identityCommitmentUsed;
    mapping(bytes32 => bool) public proofHashUsed;
    mapping(address => bool) public trustedVerifiers;

    event CandidateCreated(uint256 indexed candidateId, address indexed owner, string anonymousProfileURI);
    event JobPosted(uint256 indexed jobId, address indexed recruiter, string jobURI);
    event SkillProofAdded(uint256 indexed candidateId, uint256 indexed proofIndex, bytes32 proofHash);
    event SkillProofVerified(uint256 indexed candidateId, uint256 indexed proofIndex, address indexed verifier);
    event MatchCreated(
        uint256 indexed matchId,
        uint256 indexed candidateId,
        uint256 indexed jobId,
        bytes32 encryptedScoreHandle,
        bytes32 salaryOverlapHandle,
        bytes32 qualifiedHandle
    );
    event MatchShortlisted(uint256 indexed matchId, address indexed recruiter);
    event RevealRequested(uint256 indexed matchId, address indexed recruiter);
    event RevealApproved(uint256 indexed matchId, address indexed candidate, string identityURI);
    event JobClosed(uint256 indexed jobId);
    event VerifierUpdated(address indexed verifier, bool trusted);

    error CandidateNotFound();
    error JobNotFound();
    error MatchNotFound();
    error ProofNotFound();
    error NotCandidateOwner();
    error NotRecruiter();
    error NotTrustedVerifier();
    error DuplicateMatch();
    error DuplicateProof();
    error IdentityCommitmentUsed();
    error InvalidIdentityCommitment();
    error InvalidProofHash();
    error InvalidVerifier();
    error JobIsClosed();
    error RevealAlreadyApproved();
    error RevealAlreadyRequested();
    error RevealNotRequested();
    error EmptyURI();

    constructor() Ownable(msg.sender) {
        trustedVerifiers[msg.sender] = true;
        emit VerifierUpdated(msg.sender, true);
    }

    function createCandidate(
        string calldata anonymousProfileURI,
        bytes32 identityCommitment,
        InEuint32 memory skillScore,
        InEuint32 memory experienceYears,
        InEuint32 memory salaryMin,
        InEuint32 memory salaryMax
    ) external returns (uint256 candidateId) {
        if (bytes(anonymousProfileURI).length == 0) revert EmptyURI();
        if (identityCommitment == bytes32(0)) revert InvalidIdentityCommitment();
        if (identityCommitmentUsed[identityCommitment]) revert IdentityCommitmentUsed();

        candidateId = ++candidateCount;
        Candidate storage candidate = candidates[candidateId];
        candidate.owner = msg.sender;
        candidate.anonymousProfileURI = anonymousProfileURI;
        candidate.identityCommitment = identityCommitment;
        candidate.skillScore = FHE.asEuint32(skillScore);
        candidate.experienceYears = FHE.asEuint32(experienceYears);
        candidate.salaryMin = FHE.asEuint32(salaryMin);
        candidate.salaryMax = FHE.asEuint32(salaryMax);
        candidate.exists = true;
        identityCommitmentUsed[identityCommitment] = true;

        _allowCandidate(candidate, msg.sender);

        emit CandidateCreated(candidateId, msg.sender, anonymousProfileURI);
    }

    function postJob(
        string calldata jobURI,
        InEuint32 memory requiredSkillScore,
        InEuint32 memory minExperienceYears,
        InEuint32 memory salaryMin,
        InEuint32 memory salaryMax
    ) external returns (uint256 jobId) {
        if (bytes(jobURI).length == 0) revert EmptyURI();

        jobId = ++jobCount;
        Job storage job = jobs[jobId];
        job.recruiter = msg.sender;
        job.jobURI = jobURI;
        job.requiredSkillScore = FHE.asEuint32(requiredSkillScore);
        job.minExperienceYears = FHE.asEuint32(minExperienceYears);
        job.salaryMin = FHE.asEuint32(salaryMin);
        job.salaryMax = FHE.asEuint32(salaryMax);
        job.open = true;
        job.exists = true;

        _allowJob(job, msg.sender);

        emit JobPosted(jobId, msg.sender, jobURI);
    }

    function addSkillProof(
        uint256 candidateId,
        string calldata proofURI,
        bytes32 proofHash
    ) external returns (uint256 proofIndex) {
        Candidate storage candidate = _candidate(candidateId);
        if (candidate.owner != msg.sender) revert NotCandidateOwner();
        if (bytes(proofURI).length == 0) revert EmptyURI();
        if (proofHash == bytes32(0)) revert InvalidProofHash();
        if (proofHashUsed[proofHash]) revert DuplicateProof();

        candidate.proofCount += 1;
        proofHashUsed[proofHash] = true;
        proofsByCandidate[candidateId].push(
            SkillProof({
                proofURI: proofURI,
                proofHash: proofHash,
                verifier: address(0),
                verified: false,
                createdAt: uint64(block.timestamp),
                verifiedAt: 0
            })
        );

        proofIndex = proofsByCandidate[candidateId].length - 1;
        emit SkillProofAdded(candidateId, proofIndex, proofHash);
    }

    function verifySkillProof(uint256 candidateId, uint256 proofIndex) external {
        if (!trustedVerifiers[msg.sender]) revert NotTrustedVerifier();

        Candidate storage candidate = _candidate(candidateId);
        SkillProof storage proof = _proof(candidateId, proofIndex);

        if (!proof.verified) {
            candidate.verifiedProofs += 1;
        }

        proof.verifier = msg.sender;
        proof.verified = true;
        proof.verifiedAt = uint64(block.timestamp);

        emit SkillProofVerified(candidateId, proofIndex, msg.sender);
    }

    function createMatch(
        uint256 candidateId,
        uint256 jobId,
        InEuint32 memory aiSignal
    ) external returns (uint256 matchId) {
        Candidate storage candidate = _candidate(candidateId);
        Job storage job = _job(jobId);
        if (msg.sender != job.recruiter) revert NotRecruiter();
        if (!job.open) revert JobIsClosed();

        bytes32 pairKey = keccak256(abi.encode(candidateId, jobId));
        if (matchIdByPair[pairKey] != 0) revert DuplicateMatch();

        ebool skillOk = FHE.gte(candidate.skillScore, job.requiredSkillScore);
        ebool experienceOk = FHE.gte(candidate.experienceYears, job.minExperienceYears);
        ebool salaryLowEnough = FHE.lte(candidate.salaryMin, job.salaryMax);
        ebool salaryHighEnough = FHE.gte(candidate.salaryMax, job.salaryMin);
        ebool salaryOverlap = FHE.and(salaryLowEnough, salaryHighEnough);
        ebool qualified = FHE.and(FHE.and(skillOk, experienceOk), salaryOverlap);

        euint32 skillPoints = FHE.select(skillOk, FHE.asEuint32(40), FHE.asEuint32(15));
        euint32 experiencePoints = FHE.select(experienceOk, FHE.asEuint32(25), FHE.asEuint32(8));
        euint32 salaryPoints = FHE.select(salaryOverlap, FHE.asEuint32(25), FHE.asEuint32(5));
        euint32 proofPoints = FHE.asEuint32(candidate.verifiedProofs > 0 ? 10 : 0);
        euint32 heuristicScore = FHE.add(FHE.add(skillPoints, experiencePoints), FHE.add(salaryPoints, proofPoints));
        euint32 encryptedAiSignal = FHE.asEuint32(aiSignal);
        euint32 encryptedScore = FHE.div(FHE.add(heuristicScore, encryptedAiSignal), FHE.asEuint32(2));

        matchId = ++matchCount;
        MatchRecord storage record = matchesById[matchId];
        record.candidateId = candidateId;
        record.jobId = jobId;
        record.encryptedScore = encryptedScore;
        record.salaryOverlap = salaryOverlap;
        record.qualified = qualified;
        record.exists = true;
        matchIdByPair[pairKey] = matchId;

        _allowMatch(record, candidate.owner, job.recruiter);

        emit MatchCreated(
            matchId,
            candidateId,
            jobId,
            euint32.unwrap(encryptedScore),
            ebool.unwrap(salaryOverlap),
            ebool.unwrap(qualified)
        );
    }

    function shortlistMatch(uint256 matchId) external {
        MatchRecord storage record = _match(matchId);
        Job storage job = _job(record.jobId);
        if (msg.sender != job.recruiter) revert NotRecruiter();
        if (!job.open) revert JobIsClosed();
        if (record.revealApproved) revert RevealAlreadyApproved();

        record.shortlisted = true;
        emit MatchShortlisted(matchId, msg.sender);
    }

    function requestReveal(uint256 matchId) external {
        MatchRecord storage record = _match(matchId);
        Job storage job = _job(record.jobId);
        if (msg.sender != job.recruiter) revert NotRecruiter();
        if (!job.open) revert JobIsClosed();
        if (record.revealApproved) revert RevealAlreadyApproved();
        if (record.revealRequested) revert RevealAlreadyRequested();

        record.shortlisted = true;
        record.revealRequested = true;
        emit RevealRequested(matchId, msg.sender);
    }

    function approveReveal(uint256 matchId, string calldata identityURI) external {
        MatchRecord storage record = _match(matchId);
        Candidate storage candidate = _candidate(record.candidateId);
        Job storage job = _job(record.jobId);

        if (candidate.owner != msg.sender) revert NotCandidateOwner();
        if (!record.revealRequested) revert RevealNotRequested();
        if (record.revealApproved) revert RevealAlreadyApproved();
        if (bytes(identityURI).length == 0) revert EmptyURI();

        record.revealApproved = true;
        record.revealedIdentityURI = identityURI;

        _allowCandidate(candidate, job.recruiter);
        _allowMatch(record, candidate.owner, job.recruiter);

        emit RevealApproved(matchId, msg.sender, identityURI);
    }

    function closeJob(uint256 jobId) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.recruiter) revert NotRecruiter();

        job.open = false;
        emit JobClosed(jobId);
    }

    function setVerifier(address verifier, bool trusted) external onlyOwner {
        if (verifier == address(0)) revert InvalidVerifier();
        trustedVerifiers[verifier] = trusted;
        emit VerifierUpdated(verifier, trusted);
    }

    function getCandidate(
        uint256 candidateId
    )
        external
        view
        returns (
            address owner,
            string memory anonymousProfileURI,
            bytes32 identityCommitment,
            bytes32 skillScoreHandle,
            bytes32 experienceYearsHandle,
            bytes32 salaryMinHandle,
            bytes32 salaryMaxHandle,
            uint256 proofCount,
            uint256 verifiedProofs,
            bool exists
        )
    {
        Candidate storage candidate = candidates[candidateId];
        return (
            candidate.owner,
            candidate.anonymousProfileURI,
            candidate.identityCommitment,
            euint32.unwrap(candidate.skillScore),
            euint32.unwrap(candidate.experienceYears),
            euint32.unwrap(candidate.salaryMin),
            euint32.unwrap(candidate.salaryMax),
            candidate.proofCount,
            candidate.verifiedProofs,
            candidate.exists
        );
    }

    function getJob(
        uint256 jobId
    )
        external
        view
        returns (
            address recruiter,
            string memory jobURI,
            bytes32 requiredSkillScoreHandle,
            bytes32 minExperienceYearsHandle,
            bytes32 salaryMinHandle,
            bytes32 salaryMaxHandle,
            bool open,
            bool exists
        )
    {
        Job storage job = jobs[jobId];
        return (
            job.recruiter,
            job.jobURI,
            euint32.unwrap(job.requiredSkillScore),
            euint32.unwrap(job.minExperienceYears),
            euint32.unwrap(job.salaryMin),
            euint32.unwrap(job.salaryMax),
            job.open,
            job.exists
        );
    }

    function getSkillProof(
        uint256 candidateId,
        uint256 proofIndex
    )
        external
        view
        returns (
            string memory proofURI,
            bytes32 proofHash,
            address verifier,
            bool verified,
            uint64 createdAt,
            uint64 verifiedAt
        )
    {
        SkillProof storage proof = _proof(candidateId, proofIndex);
        return (proof.proofURI, proof.proofHash, proof.verifier, proof.verified, proof.createdAt, proof.verifiedAt);
    }

    function getMatch(
        uint256 matchId
    )
        external
        view
        returns (
            uint256 candidateId,
            uint256 jobId,
            bytes32 encryptedScoreHandle,
            bytes32 salaryOverlapHandle,
            bytes32 qualifiedHandle,
            bool shortlisted,
            bool revealRequested,
            bool revealApproved,
            string memory revealedIdentityURI,
            bool exists
        )
    {
        MatchRecord storage record = matchesById[matchId];
        return (
            record.candidateId,
            record.jobId,
            euint32.unwrap(record.encryptedScore),
            ebool.unwrap(record.salaryOverlap),
            ebool.unwrap(record.qualified),
            record.shortlisted,
            record.revealRequested,
            record.revealApproved,
            record.revealedIdentityURI,
            record.exists
        );
    }

    function _candidate(uint256 candidateId) private view returns (Candidate storage candidate) {
        candidate = candidates[candidateId];
        if (!candidate.exists) revert CandidateNotFound();
    }

    function _job(uint256 jobId) private view returns (Job storage job) {
        job = jobs[jobId];
        if (!job.exists) revert JobNotFound();
    }

    function _match(uint256 matchId) private view returns (MatchRecord storage record) {
        record = matchesById[matchId];
        if (!record.exists) revert MatchNotFound();
    }

    function _proof(uint256 candidateId, uint256 proofIndex) private view returns (SkillProof storage proof) {
        if (proofIndex >= proofsByCandidate[candidateId].length) revert ProofNotFound();
        proof = proofsByCandidate[candidateId][proofIndex];
    }

    function _allowCandidate(Candidate storage candidate, address reader) private {
        FHE.allowThis(candidate.skillScore);
        FHE.allowThis(candidate.experienceYears);
        FHE.allowThis(candidate.salaryMin);
        FHE.allowThis(candidate.salaryMax);
        FHE.allow(candidate.skillScore, reader);
        FHE.allow(candidate.experienceYears, reader);
        FHE.allow(candidate.salaryMin, reader);
        FHE.allow(candidate.salaryMax, reader);
    }

    function _allowJob(Job storage job, address reader) private {
        FHE.allowThis(job.requiredSkillScore);
        FHE.allowThis(job.minExperienceYears);
        FHE.allowThis(job.salaryMin);
        FHE.allowThis(job.salaryMax);
        FHE.allow(job.requiredSkillScore, reader);
        FHE.allow(job.minExperienceYears, reader);
        FHE.allow(job.salaryMin, reader);
        FHE.allow(job.salaryMax, reader);
    }

    function _allowMatch(MatchRecord storage record, address candidateOwner, address recruiter) private {
        FHE.allowThis(record.encryptedScore);
        FHE.allowThis(record.salaryOverlap);
        FHE.allowThis(record.qualified);
        FHE.allow(record.encryptedScore, candidateOwner);
        FHE.allow(record.salaryOverlap, candidateOwner);
        FHE.allow(record.qualified, candidateOwner);
        FHE.allow(record.encryptedScore, recruiter);
        FHE.allow(record.salaryOverlap, recruiter);
        FHE.allow(record.qualified, recruiter);
    }
}
