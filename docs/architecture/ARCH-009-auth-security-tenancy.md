# ARCH-009: Auth, Security, Tenancy

## Auth

Use Clerk for authentication.

Clerk handles:

- Sign up / sign in
- Sessions
- User identity
- Invitations/organizations where useful

## Tenancy

Use internal Workspace-based tenancy.

Core schema:

```text
User
- UserId
- ClerkUserId
- Email
- Name
- Status

Workspace
- WorkspaceId
- Name
- Slug
- Status
- ClerkOrganizationId optional

WorkspaceUser
- WorkspaceUserId
- WorkspaceId
- UserId
- Role
- Status
```

Roles:

- Owner
- Admin
- Editor
- Viewer

## Responsibility Split

- Clerk = authentication and identity
- Our database = workspace membership, product roles, permissions, access checks

## Backend Authorization Rule

Every API request must validate:

- Authenticated Clerk user
- Internal User mapping
- Workspace membership
- Role permission
- Entity belongs to workspace

Never trust frontend-selected workspace IDs without validation.

## Security Baseline

- Clerk JWT authentication
- Workspace/role authorization on every backend request
- Strict tenant scoping
- FluentValidation backend validation
- Zod frontend validation
- Azure Key Vault for cloud secrets
- Local user-secrets/env for development
- No wildcard CORS in production
- Audit logs for important business actions

## Crawler SSRF Protection

Crawler must block:

- localhost
- 127.0.0.1
- private IP ranges
- metadata endpoints
- internal network addresses
- file:// URLs
- non-http/https schemes

Crawler limits:

- HTTP/HTTPS only
- max redirects
- request timeout
- max response size
- same-domain crawl only

## Abuse / Rate Limits

Apply basic limits for:

- Discovery runs
- Scan runs
- Crawled pages
- Custom prompts
- Notification recipients
- Report generation
