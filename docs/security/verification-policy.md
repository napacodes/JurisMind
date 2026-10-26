# Verification policy

## Current authorization decision

Firm verification, individual lawyer credential verification, account status, workspace membership, and workspace role are independent authorization facts. Verification review does not change an account, membership, or role.

The current API has no operational matter, client, billing, or confidential-document business endpoints to which a verified-firm or verified-lawyer gate can be attached. Therefore the current policy adds no verification-status gate to account registration, workspace provisioning, invitations, membership management, firm KYC submission, lawyer credential submission, or authorized review. These routes continue to require their existing authenticated session, active workspace membership, role permission, or Super Admin grant. Drafts and resubmissions remain available while verification is incomplete.

When operational APIs are added, the product owner and compliance counsel must decide which operations require firm approval and which require individual lawyer approval before a backend verification gate is added. A lawyer credential decision must never imply firm approval, and a firm decision must never imply lawyer credential approval.

## Document policy configuration

`FIRM_KYC_DOCUMENT_POLICY_JSON` configures firm document types using normalized `jurisdiction|legal form` keys. The default retains the currently implemented registration and representative-authority evidence. Overrides may choose from those supported types only. `LAWYER_CREDENTIAL_DOCUMENT_POLICY_JSON` configures whether the existing license document is required by normalized jurisdiction; it defaults to required. Values must be based on counsel/compliance-approved requirements. No country/legal-form rules are inferred or shipped as legal advice.

## Expiry and renewal

`FIRM_VERIFICATION_VALIDITY_DAYS` and `LAWYER_CREDENTIAL_VALIDITY_DAYS` are optional. Unset values mean approvals do not expire automatically. Configured values are bounded to 1–3650 days and start at reviewer approval. On an authorized status or review-list read, an overdue approval is transitioned to `EXPIRED` and audited as a system event. A renewal is a new submission and independent review; no existing approval date is changed.

## Private object storage

Production requires S3-compatible storage configuration and a private bucket. Configure bucket-level Block Public Access, disable public ACLs, and grant the API credentials only the required object `PutObject`, `GetObject`, and `DeleteObject` permissions for this application's bucket. The application does not generate public or presigned URLs; every download passes through session, workspace/reviewer authorization, and a workspace-scoped object key.
