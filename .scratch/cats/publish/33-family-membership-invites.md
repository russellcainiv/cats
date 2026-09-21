# 33 — Private family membership, invite links, and multi-actor access control

**What to build:** Owner generates private invite links; daughter joins without child PII; preserves households.owner_id unique constraint; multi-member access control on all routes.

**Blocked by:** 01 — Create and resume a private saved household; 03 — Resume safely across devices and pause while away

**Status:** ready-for-agent

**Requirements:** R01, R11, R26

## Acceptance criteria

- [ ] Primary owner can generate a cryptographic invite link (POST /api/households/[id]/invites) with SHA-256 token hashing at rest (token_hash), 72-hour expiration, and single-use limit (max_uses = 1); link is shown in UI for local copying and never transmitted to external services without explicit user command.
- [ ] An invited family member can redeem the link via POST /api/invites/redeem without disclosing date of birth, age, or external personal data; server sets an authenticated session cookie (cats_session) and associates the account with household_members under family_member role; rejoin uses session cookie without re-pasting token.
- [ ] Database migration preserves the existing unique constraint on households.owner_id (idx_households_owner_unique), maintaining Task 01 owner-create concurrency safety, while creating household_members to manage multi-member authorization and roles (owner and family_member).
- [ ] All household and save routes (/api/households/[id]/*) verify requester membership in household_members; unauthenticated users receive 401, non-members receive 403, cross-household access is blocked, and owner-only operations (revocation, deletion) enforce role === 'owner'.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
