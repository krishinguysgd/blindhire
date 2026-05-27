// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract BlindHire is Ownable {
    uint256 public constant MAX_SCORE = 100;
    uint256 public constant MAX_EXPERIENCE_YEARS = 80;
    uint256 public constant MAX_SALARY = 10_000_000;

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
        uint256 assessmentCount;
        uint256 reputationScore;
        uint64 updatedAt;
        bool active;
        bool exists;
    }

    struct Job {
        address recruiter;
        string jobURI;
        euint32 requiredSkillScore;
        euint32 minExperienceYears;
        euint32 salaryMin;
        euint32 salaryMax;
        uint64 updatedAt;
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
        address oracle;
        bytes32 oracleReportHash;
        uint64 createdAt;
        bool shortlisted;
        bool revealRequested;
        bool revealApproved;
        string revealedIdentityURI;
        bool exists;
    }

    struct Assessment {
        string assessmentURI;
        bytes32 assessmentHash;
        address verifier;
        bool verified;
        uint64 createdAt;
        uint64 verifiedAt;
    }

    struct ReputationSignal {
        string signalURI;
        bytes32 signalHash;
        address issuer;
        uint64 weight;
        uint64 createdAt;
    }

    struct MatchRequest {
        uint256 candidateId;
        uint256 jobId;
        address requester;
        bool fulfilled;
        uint64 createdAt;
        bool exists;
    }

    struct VerifierProposal {
        address proposer;
        address verifier;
        uint256 approvals;
        bool executed;
        uint64 createdAt;
        bool exists;
    }

    uint256 public candidateCount;
    uint256 public jobCount;
    uint256 public matchCount;
    uint256 public matchRequestCount;
    uint256 public verifierProposalCount;
    uint256 public verifierApprovalThreshold = 2;

    mapping(uint256 => Candidate) private candidates;
    mapping(uint256 => Job) private jobs;
    mapping(uint256 => SkillProof[]) private proofsByCandidate;
    mapping(uint256 => Assessment[]) private assessmentsByCandidate;
    mapping(uint256 => ReputationSignal[]) private reputationByCandidate;
    mapping(uint256 => MatchRecord) private matchesById;
    mapping(uint256 => MatchRequest) private matchRequestsById;
    mapping(uint256 => VerifierProposal) private verifierProposals;
    mapping(uint256 => mapping(address => bool)) public verifierProposalApprovedBy;
    mapping(bytes32 => uint256) public matchIdByPair;
    mapping(bytes32 => uint256) public matchRequestIdByPair;
    mapping(bytes32 => bool) public identityCommitmentUsed;
    mapping(bytes32 => bool) public proofHashUsed;
    mapping(bytes32 => bool) public assessmentHashUsed;
    mapping(bytes32 => bool) public reputationHashUsed;
    mapping(address => bool) public trustedVerifiers;
    mapping(address => bool) public trustedAiOracles;

    event CandidateCreated(uint256 indexed candidateId, address indexed owner, string anonymousProfileURI);
    event CandidateProfileUpdated(uint256 indexed candidateId, address indexed owner, string anonymousProfileURI);
    event CandidateDeactivated(uint256 indexed candidateId, address indexed owner);
    event JobPosted(uint256 indexed jobId, address indexed recruiter, string jobURI);
    event JobUpdated(uint256 indexed jobId, address indexed recruiter, string jobURI);
    event SkillProofAdded(uint256 indexed candidateId, uint256 indexed proofIndex, bytes32 proofHash);
    event SkillProofVerified(uint256 indexed candidateId, uint256 indexed proofIndex, address indexed verifier);
    event AssessmentSubmitted(uint256 indexed candidateId, uint256 indexed assessmentIndex, bytes32 assessmentHash);
    event AssessmentVerified(uint256 indexed candidateId, uint256 indexed assessmentIndex, address indexed verifier);
    event ReputationSignalRecorded(
        uint256 indexed candidateId,
        uint256 indexed signalIndex,
        address indexed issuer,
        uint64 weight,
        bytes32 signalHash
    );
    event MatchRequested(uint256 indexed requestId, uint256 indexed candidateId, uint256 indexed jobId, address requester);
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
    event VerifierProposalCreated(uint256 indexed proposalId, address indexed proposer, address indexed verifier);
    event VerifierProposalApproved(uint256 indexed proposalId, address indexed approver, uint256 approvals);
    event VerifierApprovalThresholdUpdated(uint256 threshold);
    event AiOracleUpdated(address indexed oracle, bool trusted);

    error CandidateNotFound();
    error JobNotFound();
    error MatchNotFound();
    error MatchRequestNotFound();
    error ProofNotFound();
    error AssessmentNotFound();
    error ReputationSignalNotFound();
    error VerifierProposalNotFound();
    error NotCandidateOwner();
    error NotRecruiter();
    error NotTrustedVerifier();
    error NotTrustedAiOracle();
    error DuplicateMatch();
    error DuplicateMatchRequest();
    error DuplicateProof();
    error DuplicateAssessment();
    error DuplicateReputationSignal();
    error ProofAlreadyVerified();
    error AssessmentAlreadyVerified();
    error IdentityCommitmentUsed();
    error InvalidIdentityCommitment();
    error InvalidProofHash();
    error InvalidAssessmentHash();
    error InvalidReputationHash();
    error InvalidOracleReport();
    error InvalidVerifier();
    error InvalidWeight();
    error InvalidThreshold();
    error CandidateInactive();
    error JobIsClosed();
    error RevealAlreadyApproved();
    error RevealAlreadyRequested();
    error RevealNotRequested();
    error InvalidIdentityReveal();
    error VerifierAlreadyTrusted();
    error VerifierProposalAlreadyApproved();
    error VerifierProposalExecuted();
    error EmptyURI();

    constructor() Ownable(msg.sender) {
        trustedVerifiers[msg.sender] = true;
        trustedAiOracles[msg.sender] = true;
        emit VerifierUpdated(msg.sender, true);
        emit AiOracleUpdated(msg.sender, true);
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
        (euint32 normalizedSalaryMin, euint32 normalizedSalaryMax) = _normalizeSalaryRange(salaryMin, salaryMax);
        candidate.skillScore = _boundedInput(skillScore, MAX_SCORE);
        candidate.experienceYears = _boundedInput(experienceYears, MAX_EXPERIENCE_YEARS);
        candidate.salaryMin = normalizedSalaryMin;
        candidate.salaryMax = normalizedSalaryMax;
        candidate.active = true;
        candidate.updatedAt = uint64(block.timestamp);
        candidate.exists = true;
        identityCommitmentUsed[identityCommitment] = true;

        _allowCandidate(candidate, msg.sender);

        emit CandidateCreated(candidateId, msg.sender, anonymousProfileURI);
    }

    function updateCandidateProfile(uint256 candidateId, string calldata anonymousProfileURI) external {
        Candidate storage candidate = _candidate(candidateId);
        if (candidate.owner != msg.sender) revert NotCandidateOwner();
        if (!candidate.active) revert CandidateInactive();
        if (bytes(anonymousProfileURI).length == 0) revert EmptyURI();

        candidate.anonymousProfileURI = anonymousProfileURI;
        candidate.updatedAt = uint64(block.timestamp);

        emit CandidateProfileUpdated(candidateId, msg.sender, anonymousProfileURI);
    }

    function deactivateCandidate(uint256 candidateId) external {
        Candidate storage candidate = _candidate(candidateId);
        if (candidate.owner != msg.sender) revert NotCandidateOwner();
        if (!candidate.active) revert CandidateInactive();

        candidate.active = false;
        candidate.updatedAt = uint64(block.timestamp);

        emit CandidateDeactivated(candidateId, msg.sender);
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
        (euint32 normalizedSalaryMin, euint32 normalizedSalaryMax) = _normalizeSalaryRange(salaryMin, salaryMax);
        job.requiredSkillScore = _boundedInput(requiredSkillScore, MAX_SCORE);
        job.minExperienceYears = _boundedInput(minExperienceYears, MAX_EXPERIENCE_YEARS);
        job.salaryMin = normalizedSalaryMin;
        job.salaryMax = normalizedSalaryMax;
        job.updatedAt = uint64(block.timestamp);
        job.open = true;
        job.exists = true;

        _allowJob(job, msg.sender);

        emit JobPosted(jobId, msg.sender, jobURI);
    }

    function updateJobMetadata(uint256 jobId, string calldata jobURI) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.recruiter) revert NotRecruiter();
        if (!job.open) revert JobIsClosed();
        if (bytes(jobURI).length == 0) revert EmptyURI();

        job.jobURI = jobURI;
        job.updatedAt = uint64(block.timestamp);

        emit JobUpdated(jobId, msg.sender, jobURI);
    }

    function addSkillProof(
        uint256 candidateId,
        string calldata proofURI,
        bytes32 proofHash
    ) external returns (uint256 proofIndex) {
        Candidate storage candidate = _candidate(candidateId);
        if (candidate.owner != msg.sender) revert NotCandidateOwner();
        if (!candidate.active) revert CandidateInactive();
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
        if (!candidate.active) revert CandidateInactive();
        if (proof.verified) revert ProofAlreadyVerified();

        candidate.verifiedProofs += 1;
        proof.verifier = msg.sender;
        proof.verified = true;
        proof.verifiedAt = uint64(block.timestamp);

        emit SkillProofVerified(candidateId, proofIndex, msg.sender);
    }

    function submitAssessment(
        uint256 candidateId,
        string calldata assessmentURI,
        bytes32 assessmentHash
    ) external returns (uint256 assessmentIndex) {
        Candidate storage candidate = _candidate(candidateId);
        if (candidate.owner != msg.sender) revert NotCandidateOwner();
        if (!candidate.active) revert CandidateInactive();
        if (bytes(assessmentURI).length == 0) revert EmptyURI();
        if (assessmentHash == bytes32(0)) revert InvalidAssessmentHash();
        if (assessmentHashUsed[assessmentHash]) revert DuplicateAssessment();

        candidate.assessmentCount += 1;
        assessmentHashUsed[assessmentHash] = true;
        assessmentsByCandidate[candidateId].push(
            Assessment({
                assessmentURI: assessmentURI,
                assessmentHash: assessmentHash,
                verifier: address(0),
                verified: false,
                createdAt: uint64(block.timestamp),
                verifiedAt: 0
            })
        );

        assessmentIndex = assessmentsByCandidate[candidateId].length - 1;
        emit AssessmentSubmitted(candidateId, assessmentIndex, assessmentHash);
    }

    function verifyAssessment(uint256 candidateId, uint256 assessmentIndex) external {
        if (!trustedVerifiers[msg.sender]) revert NotTrustedVerifier();

        Candidate storage candidate = _candidate(candidateId);
        Assessment storage assessment = _assessment(candidateId, assessmentIndex);
        if (!candidate.active) revert CandidateInactive();
        if (assessment.verified) revert AssessmentAlreadyVerified();

        candidate.reputationScore += 20;
        assessment.verifier = msg.sender;
        assessment.verified = true;
        assessment.verifiedAt = uint64(block.timestamp);

        emit AssessmentVerified(candidateId, assessmentIndex, msg.sender);
    }

    function recordReputationSignal(
        uint256 candidateId,
        string calldata signalURI,
        bytes32 signalHash,
        uint64 weight
    ) external returns (uint256 signalIndex) {
        if (!trustedVerifiers[msg.sender]) revert NotTrustedVerifier();
        Candidate storage candidate = _candidate(candidateId);
        if (!candidate.active) revert CandidateInactive();
        if (bytes(signalURI).length == 0) revert EmptyURI();
        if (signalHash == bytes32(0)) revert InvalidReputationHash();
        if (reputationHashUsed[signalHash]) revert DuplicateReputationSignal();
        if (weight == 0 || weight > 100) revert InvalidWeight();

        reputationHashUsed[signalHash] = true;
        candidate.reputationScore += weight;
        reputationByCandidate[candidateId].push(
            ReputationSignal({
                signalURI: signalURI,
                signalHash: signalHash,
                issuer: msg.sender,
                weight: weight,
                createdAt: uint64(block.timestamp)
            })
        );

        signalIndex = reputationByCandidate[candidateId].length - 1;
        emit ReputationSignalRecorded(candidateId, signalIndex, msg.sender, weight, signalHash);
    }

    function requestMatch(uint256 candidateId, uint256 jobId) external returns (uint256 requestId) {
        Candidate storage candidate = _candidate(candidateId);
        Job storage job = _job(jobId);
        if (candidate.owner != msg.sender) revert NotCandidateOwner();
        if (!candidate.active) revert CandidateInactive();
        if (!job.open) revert JobIsClosed();

        bytes32 pairKey = keccak256(abi.encode(candidateId, jobId));
        if (matchIdByPair[pairKey] != 0) revert DuplicateMatch();
        if (matchRequestIdByPair[pairKey] != 0) revert DuplicateMatchRequest();

        requestId = ++matchRequestCount;
        matchRequestsById[requestId] = MatchRequest({
            candidateId: candidateId,
            jobId: jobId,
            requester: msg.sender,
            fulfilled: false,
            createdAt: uint64(block.timestamp),
            exists: true
        });
        matchRequestIdByPair[pairKey] = requestId;

        emit MatchRequested(requestId, candidateId, jobId, msg.sender);
    }

    function createMatch(
        uint256 candidateId,
        uint256 jobId,
        InEuint32 memory aiSignal
    ) external returns (uint256 matchId) {
        Job storage job = _job(jobId);
        if (msg.sender != job.recruiter) revert NotRecruiter();
        matchId = _createMatch(candidateId, jobId, aiSignal, address(0), bytes32(0));
    }

    function createMatchWithOracleSignal(
        uint256 candidateId,
        uint256 jobId,
        InEuint32 memory aiSignal,
        bytes32 oracleReportHash
    ) external returns (uint256 matchId) {
        if (!trustedAiOracles[msg.sender]) revert NotTrustedAiOracle();
        if (oracleReportHash == bytes32(0)) revert InvalidOracleReport();
        matchId = _createMatch(candidateId, jobId, aiSignal, msg.sender, oracleReportHash);
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

    function approveReveal(uint256 matchId, string calldata identityURI, bytes32 identitySalt) external {
        MatchRecord storage record = _match(matchId);
        Candidate storage candidate = _candidate(record.candidateId);
        Job storage job = _job(record.jobId);

        if (candidate.owner != msg.sender) revert NotCandidateOwner();
        if (!record.revealRequested) revert RevealNotRequested();
        if (record.revealApproved) revert RevealAlreadyApproved();
        if (bytes(identityURI).length == 0) revert EmptyURI();
        if (
            identitySalt == bytes32(0) ||
            keccak256(abi.encodePacked(identityURI, identitySalt)) != candidate.identityCommitment
        ) {
            revert InvalidIdentityReveal();
        }

        record.revealApproved = true;
        record.revealedIdentityURI = identityURI;

        _allowCandidate(candidate, job.recruiter);
        _allowMatch(record, candidate.owner, job.recruiter);

        emit RevealApproved(matchId, msg.sender, identityURI);
    }

    function closeJob(uint256 jobId) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.recruiter) revert NotRecruiter();
        if (!job.open) revert JobIsClosed();

        job.open = false;
        job.updatedAt = uint64(block.timestamp);
        emit JobClosed(jobId);
    }

    function setVerifier(address verifier, bool trusted) external onlyOwner {
        if (verifier == address(0)) revert InvalidVerifier();
        trustedVerifiers[verifier] = trusted;
        emit VerifierUpdated(verifier, trusted);
    }

    function setAiOracle(address oracle, bool trusted) external onlyOwner {
        if (oracle == address(0)) revert InvalidVerifier();
        trustedAiOracles[oracle] = trusted;
        emit AiOracleUpdated(oracle, trusted);
    }

    function setVerifierApprovalThreshold(uint256 threshold) external onlyOwner {
        if (threshold == 0) revert InvalidThreshold();
        verifierApprovalThreshold = threshold;
        emit VerifierApprovalThresholdUpdated(threshold);
    }

    function proposeVerifier(address verifier) external returns (uint256 proposalId) {
        if (!trustedVerifiers[msg.sender] && msg.sender != owner()) revert NotTrustedVerifier();
        if (verifier == address(0)) revert InvalidVerifier();
        if (trustedVerifiers[verifier]) revert VerifierAlreadyTrusted();

        proposalId = ++verifierProposalCount;
        verifierProposals[proposalId] = VerifierProposal({
            proposer: msg.sender,
            verifier: verifier,
            approvals: 0,
            executed: false,
            createdAt: uint64(block.timestamp),
            exists: true
        });

        emit VerifierProposalCreated(proposalId, msg.sender, verifier);
        _approveVerifierProposal(proposalId, msg.sender);
    }

    function approveVerifierProposal(uint256 proposalId) external {
        if (!trustedVerifiers[msg.sender] && msg.sender != owner()) revert NotTrustedVerifier();
        _approveVerifierProposal(proposalId, msg.sender);
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
            bool exists,
            bool active,
            uint256 assessmentCount,
            uint256 reputationScore,
            uint64 updatedAt
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
            candidate.exists,
            candidate.active,
            candidate.assessmentCount,
            candidate.reputationScore,
            candidate.updatedAt
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
            bool exists,
            uint64 updatedAt
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
            job.exists,
            job.updatedAt
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

    function getAssessment(
        uint256 candidateId,
        uint256 assessmentIndex
    )
        external
        view
        returns (
            string memory assessmentURI,
            bytes32 assessmentHash,
            address verifier,
            bool verified,
            uint64 createdAt,
            uint64 verifiedAt
        )
    {
        Assessment storage assessment = _assessment(candidateId, assessmentIndex);
        return (
            assessment.assessmentURI,
            assessment.assessmentHash,
            assessment.verifier,
            assessment.verified,
            assessment.createdAt,
            assessment.verifiedAt
        );
    }

    function getReputationSignal(
        uint256 candidateId,
        uint256 signalIndex
    )
        external
        view
        returns (string memory signalURI, bytes32 signalHash, address issuer, uint64 weight, uint64 createdAt)
    {
        ReputationSignal storage signal = _reputationSignal(candidateId, signalIndex);
        return (signal.signalURI, signal.signalHash, signal.issuer, signal.weight, signal.createdAt);
    }

    function reputationSignalCount(uint256 candidateId) external view returns (uint256) {
        return reputationByCandidate[candidateId].length;
    }

    function getMatchRequest(
        uint256 requestId
    )
        external
        view
        returns (uint256 candidateId, uint256 jobId, address requester, bool fulfilled, uint64 createdAt, bool exists)
    {
        MatchRequest storage request = matchRequestsById[requestId];
        return (request.candidateId, request.jobId, request.requester, request.fulfilled, request.createdAt, request.exists);
    }

    function getVerifierProposal(
        uint256 proposalId
    )
        external
        view
        returns (address proposer, address verifier, uint256 approvals, bool executed, uint64 createdAt, bool exists)
    {
        VerifierProposal storage proposal = verifierProposals[proposalId];
        return (
            proposal.proposer,
            proposal.verifier,
            proposal.approvals,
            proposal.executed,
            proposal.createdAt,
            proposal.exists
        );
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

    function getMatchAudit(uint256 matchId) external view returns (address oracle, bytes32 oracleReportHash, uint64 createdAt) {
        MatchRecord storage record = _match(matchId);
        return (record.oracle, record.oracleReportHash, record.createdAt);
    }

    function _createMatch(
        uint256 candidateId,
        uint256 jobId,
        InEuint32 memory aiSignal,
        address oracle,
        bytes32 oracleReportHash
    ) private returns (uint256 matchId) {
        Candidate storage candidate = _candidate(candidateId);
        Job storage job = _job(jobId);
        if (!candidate.active) revert CandidateInactive();
        if (!job.open) revert JobIsClosed();

        bytes32 pairKey = keccak256(abi.encode(candidateId, jobId));
        if (matchIdByPair[pairKey] != 0) revert DuplicateMatch();
        uint256 requestId = matchRequestIdByPair[pairKey];
        if (requestId == 0) revert MatchRequestNotFound();

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
        euint32 encryptedAiSignal = _boundedInput(aiSignal, MAX_SCORE);
        euint32 encryptedScore = FHE.div(FHE.add(heuristicScore, encryptedAiSignal), FHE.asEuint32(2));

        matchId = ++matchCount;
        MatchRecord storage record = matchesById[matchId];
        record.candidateId = candidateId;
        record.jobId = jobId;
        record.encryptedScore = encryptedScore;
        record.salaryOverlap = salaryOverlap;
        record.qualified = qualified;
        record.oracle = oracle;
        record.oracleReportHash = oracleReportHash;
        record.createdAt = uint64(block.timestamp);
        record.exists = true;
        matchIdByPair[pairKey] = matchId;

        if (requestId != 0) {
            matchRequestsById[requestId].fulfilled = true;
        }

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

    function _approveVerifierProposal(uint256 proposalId, address approver) private {
        VerifierProposal storage proposal = _verifierProposal(proposalId);
        if (proposal.executed) revert VerifierProposalExecuted();
        if (verifierProposalApprovedBy[proposalId][approver]) revert VerifierProposalAlreadyApproved();

        verifierProposalApprovedBy[proposalId][approver] = true;
        proposal.approvals += 1;

        emit VerifierProposalApproved(proposalId, approver, proposal.approvals);

        if (proposal.approvals >= verifierApprovalThreshold) {
            proposal.executed = true;
            trustedVerifiers[proposal.verifier] = true;
            emit VerifierUpdated(proposal.verifier, true);
        }
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

    function _assessment(
        uint256 candidateId,
        uint256 assessmentIndex
    ) private view returns (Assessment storage assessment) {
        if (assessmentIndex >= assessmentsByCandidate[candidateId].length) revert AssessmentNotFound();
        assessment = assessmentsByCandidate[candidateId][assessmentIndex];
    }

    function _reputationSignal(
        uint256 candidateId,
        uint256 signalIndex
    ) private view returns (ReputationSignal storage signal) {
        if (signalIndex >= reputationByCandidate[candidateId].length) revert ReputationSignalNotFound();
        signal = reputationByCandidate[candidateId][signalIndex];
    }

    function _verifierProposal(uint256 proposalId) private view returns (VerifierProposal storage proposal) {
        proposal = verifierProposals[proposalId];
        if (!proposal.exists) revert VerifierProposalNotFound();
    }

    function _boundedInput(InEuint32 memory input, uint256 maxValue) private returns (euint32) {
        return FHE.min(FHE.asEuint32(input), FHE.asEuint32(maxValue));
    }

    function _normalizeSalaryRange(
        InEuint32 memory salaryMin,
        InEuint32 memory salaryMax
    ) private returns (euint32 normalizedMin, euint32 normalizedMax) {
        euint32 boundedMin = FHE.min(FHE.asEuint32(salaryMin), FHE.asEuint32(MAX_SALARY));
        euint32 boundedMax = FHE.min(FHE.asEuint32(salaryMax), FHE.asEuint32(MAX_SALARY));
        normalizedMin = FHE.min(boundedMin, boundedMax);
        normalizedMax = FHE.max(boundedMin, boundedMax);
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
