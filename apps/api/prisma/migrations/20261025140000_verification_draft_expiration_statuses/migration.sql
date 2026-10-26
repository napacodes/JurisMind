ALTER TYPE "LawyerCredentialSubmissionStatus" ADD VALUE 'DRAFT' BEFORE 'PENDING';
ALTER TYPE "LawyerCredentialSubmissionStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "FirmVerificationStatus" ADD VALUE 'DRAFT' BEFORE 'PENDING';
ALTER TYPE "FirmVerificationStatus" ADD VALUE 'EXPIRED';
