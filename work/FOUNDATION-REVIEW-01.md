# Coordinator finding — authentication must be real

2026-09-20 source review of src/app/api/auth/session/route.ts POST found that request body userId (or default test-owner-01) directly receives a signed session after an allowlist lookup. This proves no identity; anybody who knows an allowlisted ID can impersonate it. It violates Task01, R11 and server-auth contract. No delivery/preview/production acceptance can use this endpoint.

Replace the identity-by-JSON flow with real verified authentication before continuing acceptance. Clerk/Auth.js or another sound current library is fine; engineering stack defaults are not immutable. An isolated credential-backed development identity can use strong per-account password hashing and a genuine secret check; simply naming an allowlisted user or test account is never sufficient. Secret values stay in ignored local env/real database, never public Git or printed logs. No fallback development secret or default user in production. The real user login is accessible and works on phone and desktop. Test-only fixture setup must be cryptographically authenticated AND unavailable in production.

Required negative reproductions: anonymous empty POST, anonymous known-userId POST, wrong credential, expired token, forged token and removed allowlist cannot get an authenticated session or read/write household state. Real authorized dev/test identity can sign in, create once, sign out, then sign back in and recover the same persisted household.

You own this repair. The coordinator will review again. Preserve existing WIP and do not lower original criteria. Continue independent work if an external enrollment needs user input, but do not substitute a demo login.

Core b5f4c86 was independently rejected and is being repaired by AGY in cats-engine. Its current files are not accepted yet; avoid duplicate domain architecture. World UI peer owns the actual gameplay shell. Do not stop at Task01 completion; report a recoverable checkpoint for integration.
