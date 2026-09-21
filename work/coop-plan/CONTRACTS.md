# Private Family Co-Op: Technical Contracts & Schemas

## 1. Database Migrations (PostgreSQL DDL)

To transition from single-player exclusivity to secure private family co-op without breaking existing Task 01–32 schema, the following migration is defined.
**Critical Rule**: The unique constraint on `households.owner_id` (`idx_households_owner_unique`) is **STRICTLY PRESERVED** to protect single-owner creation concurrency and household identity integrity. Multi-actor authorization is managed cleanly via the `household_members` relation.

```sql
-- Migration: 002_coop_family_membership.sql

-- 1. Preserve households.owner_id UNIQUE constraint (DO NOT DROP)
-- idx_households_owner_unique remains active on households(owner_id).

-- 2. Household membership table (Owner and Invited Family Members)
CREATE TABLE IF NOT EXISTS household_members (
  household_id VARCHAR(64) NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'family_member')),
  display_name VARCHAR(64) NOT NULL,
  color_theme VARCHAR(32) NOT NULL DEFAULT 'coral', -- 'coral', 'lavender', 'mint', 'amber'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);

-- Backfill initial owner membership for existing households
INSERT INTO household_members (household_id, user_id, role, display_name, color_theme, joined_at)
SELECT id, owner_id, 'owner', 'Mom', 'coral', created_at
FROM households
ON CONFLICT (household_id, user_id) DO NOTHING;

-- 3. Private Invitation Links (Secret Capabilities)
CREATE TABLE IF NOT EXISTS household_invites (
  id VARCHAR(64) PRIMARY KEY,
  household_id VARCHAR(64) NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of high-entropy secret token
  created_by VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_role VARCHAR(64) NOT NULL DEFAULT 'family_member',
  max_uses INT NOT NULL DEFAULT 1,
  uses_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_invites_token ON household_invites(token_hash) WHERE revoked_at IS NULL;

-- 4. Dynamic Simulation Lease (Timing Leader Authority)
CREATE TABLE IF NOT EXISTS sim_leases (
  household_id VARCHAR(64) PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  host_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(128) NOT NULL,
  epoch INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL, -- 10-second TTL
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Monotonic Co-Op Command Log (Event Delivery)
-- Ephemeral event delivery log for active SSE streaming and cursor reconnection.
-- Pruned after 15 minutes once commands are committed into snapshots.
CREATE TABLE IF NOT EXISTS coop_commands (
  id VARCHAR(128) PRIMARY KEY, -- Event UUID
  household_id VARCHAR(64) NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cmd_seq BIGSERIAL,
  actor_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  command_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  client_time BIGINT NOT NULL,
  resulting_revision INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coop_commands_seq ON coop_commands(household_id, cmd_seq);
CREATE INDEX IF NOT EXISTS idx_coop_commands_created ON coop_commands(household_id, created_at DESC);

-- 6. Durable Idempotent Command Receipts
-- Retained indefinitely or across bounded monotonic actor sequence windows.
-- Prevents duplicate execution of financial purchases, adoptions, recruitments, and births on network retry.
CREATE TABLE IF NOT EXISTS command_receipts (
  household_id VARCHAR(64) NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  client_command_id VARCHAR(128) NOT NULL,
  actor_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_seq BIGINT NOT NULL,
  cmd_seq BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL, -- 'committed' | 'rejected'
  response_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, client_command_id)
);

CREATE INDEX IF NOT EXISTS idx_command_receipts_actor ON command_receipts(household_id, actor_id, actor_seq DESC);

-- 7. Co-Op Active Presence & Heartbeats
CREATE TABLE IF NOT EXISTS coop_presence (
  household_id VARCHAR(64) NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(128) NOT NULL,
  selected_cat_id VARCHAR(64),
  cursor_x FLOAT,
  cursor_y FLOAT,
  lot_id VARCHAR(64) NOT NULL DEFAULT 'home',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id, session_id)
);
```

---

## 2. Network & API Contract

### Route Endpoints

#### 1. `POST /api/households/[id]/invites`
- **Purpose**: Primary owner creates a secure one-time invitation link for family member.
- **Authorization**: Server-side session check. Requester must be `role === 'owner'` in `household_members`.
- **Request Body**:
  ```json
  {
    "displayRole": "family_member",
    "expiresInHours": 72
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "inviteId": "inv_8f7b2c",
    "inviteUrl": "https://cats.app/join/tkn_9a8b7c6d5e4f3a2b1c0d",
    "expiresAt": "2026-09-23T18:00:00Z"
  }
  ```
- **Security Rule**: The raw token is returned only once to the owner in the API response. Only the SHA-256 hash (`token_hash`) is stored in PostgreSQL. The link is never sent via third-party email/SMS; UI displays a "Copy Link" button for out-of-band family sharing.

#### 2. `POST /api/invites/redeem`
- **Purpose**: Daughter redeems an invitation link without disclosing date of birth, age, or external personal data.
- **Authorization**: Public endpoint; requires valid unexpired, unrevoked secret token in body.
- **Request Body**:
  ```json
  {
    "token": "tkn_9a8b7c6d5e4f3a2b1c0d",
    "displayName": "Daughter",
    "colorTheme": "lavender"
  }
  ```
- **Child-Safe Privacy**: No date of birth, age, school, phone number, real name, or email address is collected or prompted.
- **Response `200 OK`**:
  - Sets HTTP-only, secure `cats_session` cookie for subsequent authenticated requests.
  - Inserts `household_members` row with role `'family_member'`.
  ```json
  {
    "householdId": "hh_live_123",
    "displayName": "Daughter",
    "role": "family_member",
    "colorTheme": "lavender"
  }
  ```
- **Rejoin Semantics**: Subsequent visits use the standard session cookie. The daughter never needs to re-enter or re-paste the invite link.

#### 3. `POST /api/households/[id]/members/[memberId]/revoke`
- **Purpose**: Primary owner revokes family member access at any time.
- **Authorization**: Server-side check: caller must be `role === 'owner'`.
- **Caretaker Profile & Custody Preservation**:
  - Revoking an invitee terminates their authenticated session, invalidates active tokens, and closes open SSE streams.
  - **Zero Deletion & Zero Silent Transfer**: Cats assigned to the revoked member's caretaker slot profile (Profile Beta) are **NEVER deleted and NEVER silently moved into the owner's slots**.
  - Profile Beta cats remain assigned to Profile Beta in `WorldState.cats` with complete lineage, friendship, and stats intact.
  - The remaining active owner can direct and care for them under the working **SharedCare** default.
  - **Rebinding Semantics**: When a new or returning family member redeems an invite, they bind to Profile Beta, regaining direct custody of those existing cats without creating a third roster or expanding household capacity beyond 8.
- **Response `200 OK`**: `{ "revoked": true, "memberId": "usr_daughter", "caretakerProfile": "beta", "catsPreserved": 4 }`.

#### 4. `POST /api/households/[id]/cats/[id]/reassign`
- **Purpose**: Explicitly transfer cat custody between caretaker profiles (Profile Alpha <-> Profile Beta).
- **Authorization**: Active household member (`owner` or `family_member`).
- **Request Body**:
  ```json
  {
    "targetProfile": "alpha",
    "reason": "voluntary_transfer"
  }
  ```
- **Execution & Invariant Checks**:
  1. Verifies cat exists in household and destination profile differs from current.
  2. Verifies destination profile capacity: `livingCount + reservedSlots < 4`.
  3. **Atomic Gestating Parent Reservation**: If the cat is currently pregnant, reassigning requires moving the reserved litter slot along with the parent. Destination profile must have capacity for `1 (parent) + reservedLitterSlots`. If capacity is insufficient, the transaction aborts with `422 Unprocessable Entity` (`INSUFFICIENT_PROFILE_CAPACITY_FOR_PREGNANCY`).
  4. Atomically updates `cat.caretakerProfile` in `WorldState` within a PostgreSQL transaction.
- **Response `200 OK`**: `{ "catId": "cat_mochi", "newProfile": "alpha", "profileCounts": { "alpha": 3, "beta": 2 } }`.

#### 5. `GET /api/households/[id]/coop/stream`
- **Purpose**: Low-latency Server-Sent Events (SSE) stream for real-time downstream broadcast.
- **Authorization**: Session cookie must belong to authorized member in `household_members`.
- **Request Headers**:
  - `Accept: text/event-stream`
  - `Last-Event-ID: 102` (Optional: resumes missed events after reconnect)
- **Response `200 OK` (`text/event-stream`)**:
  - Streams newline-delimited SSE chunks:
  ```text
  event: init
  data: {"revision":42,"simMinute":180,"members":[...],"selectedCats":{"usr_mom":"cat_mochi"}}

  event: command
  id: 103
  data: {"seq":103,"actorId":"usr_daughter","commandId":"cmd_01","type":"CAT_FEED","payload":{"catId":"cat_mochi"}}

  event: state_tick
  id: 104
  data: {"seq":104,"revision":43,"simMinute":181}

  : ping
  ```
- **Durable Database Query Loop (No In-Memory Broadcast)**:
  - Ephemeral Vercel containers do not share memory. The stream route handler on Container A executes an asynchronous generator loop over PostgreSQL:
    `SELECT * FROM coop_commands WHERE household_id = $id AND cmd_seq > $lastSeen ORDER BY cmd_seq ASC LIMIT 50`.
  - Short bounded polling cadence: 250ms–500ms between database checks.
  - **Connection Pooling & Cancellation**: Queries use pooled client connections with strict connection timeouts and pool limits. When the client disconnects, `req.signal.onabort` immediately cancels pending queries and terminates the loop, preventing leaking database connections.
  - **Pruning & Snapshot Reload**: If reconnecting client passes `Last-Event-ID` that has been pruned from `coop_commands` (> 15 minutes old), server emits `event: snapshot_reload` with the full current snapshot and cursor sequence, ordering snapshot state before resume events.

#### 6. `POST /api/households/[id]/coop/command`
- **Purpose**: Submit player command from either authorized family member.
- **Authorization**: Requester must be authorized member in `household_members`.
- **Request Body**:
  ```json
  {
    "commandId": "cmd_client_uuid_789",
    "actorSeq": 15,
    "expectedRevision": 42,
    "command": {
      "type": "CAT_GROOM",
      "payload": { "catId": "cat_mochi" }
    }
  }
  ```
- **Server Execution & Authoritative Reducer**:
  1. Validates member session, schema, and capability.
  2. Begins PostgreSQL transaction: `SELECT * FROM households WHERE id = $id FOR UPDATE`.
  3. Checks `command_receipts WHERE household_id = $id AND client_command_id = $commandId`. If receipt exists, returns cached response immediately (idempotent retry).
  4. Validates `actorSeq`: if `actorSeq <= min_retained_seq` for that actor, rejects with `409 Conflict` (`EXPIRED_COMMAND_SEQUENCE`), never executing as new.
  5. Runs canonical `dispatch(currentWorldState, command, actorContext)` server-side. Client-authored replacement state is rejected.
  6. Atomically commits in single transaction:
     - Updated `snapshots` (`world`, incremented `revision`).
     - Appended `coop_commands` event row (`cmd_seq BIGSERIAL`).
     - Durable `command_receipts` entry (`client_command_id`, `actor_seq`, `status`, `response_payload`).
  7. Writes are visible to the SSE query loop only after transaction commit.
  8. Returns `200 OK { "commandId": "cmd_client_uuid_789", "seq": 105, "revision": 43, "status": "committed" }`.

#### 7. `POST /api/households/[id]/coop/tick`
- **Purpose**: Designated simulation host (timing leader) schedules bounded time advance.
- **Authorization**: Requester must hold active `sim_leases` record with matching `epoch`.
- **Request Body**:
  ```json
  {
    "leaseEpoch": 2,
    "elapsedSimMinutes": 1
  }
  ```
- **Server Execution**:
  1. Validates `sim_leases.expires_at > NOW()` and `sim_leases.epoch == request.leaseEpoch`. Non-hosts receive `409 Conflict`.
  2. Bounded clamp: `elapsedSimMinutes` is clamped to max 1 sim minute (1 real second cadence; zero runaway catch-up).
  3. Runs canonical `advance(state, 1)` server-side within PostgreSQL transaction, updates snapshot revision, and appends tick event to `coop_commands`.
  4. Returns `200 OK { "revision": 44, "simMinute": 182 }`.

#### 8. `POST /api/households/[id]/coop/heartbeat`
- **Purpose**: Host renews 10-second simulation lease every 3 seconds.
- **Request Body**: `{ "sessionId": "sess_host_456", "epoch": 2 }`
- **Response `200 OK`**: `{ "expiresAt": "2026-09-20T18:05:10Z", "epoch": 2 }`

#### 9. `POST /api/households/[id]/coop/lease/claim`
- **Purpose**: Secondary peer acquires host authority when current lease expires or is released.
- **Execution**: Atomic CAS: `UPDATE sim_leases SET host_user_id = $userId, session_id = $sessionId, epoch = epoch + 1, expires_at = NOW() + INTERVAL '10 seconds' WHERE household_id = $id AND expires_at <= NOW()`.
- **Response `200 OK`**: `{ "acquired": true, "epoch": 3 }` or `409 Conflict` if lease is still active.

#### 10. `POST /api/households/[id]/coop/lease/release`
- **Purpose**: Active host explicitly relinquishes lease upon clean navigation, tab close, or pause.
- **Response `200 OK`**: Sets `expires_at = NOW()`, enabling instant peer takeover (< 1 second).

#### 11. `POST /api/households/[id]/coop/pause` & `POST /api/households/[id]/coop/resume`
- **Purpose**: Cooperative pause control accessible to either player.
- **Behavior**: Commits `coop_pause` or `coop_resume` event into `coop_commands`. While paused, all tick requests are rejected, and zero sim minutes advance.

---

## 3. Consolidated 21-Route Actor Permission Matrix

| # | Endpoint & Method | Anonymous | Allowlisted Non-Member | Family Member (`family_member`) | Primary Owner (`owner`) | Host Leader (Active Lease) | Failure Response |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `POST /api/households` | 401 | 201 Created (Max 1) | 409 (Already in household) | 409 (Already owns household) | N/A | 401 / 403 / 409 |
| 2 | `GET /api/households` | 401 | 200 OK (Empty list) | 200 OK (Joined household) | 200 OK (Owned household) | 200 OK | 401 |
| 3 | `GET /api/households/[id]` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 / 404 |
| 4 | `GET /api/households/[id]/view` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 / 404 |
| 5 | `POST /api/households/[id]/save` | 401 | 403 Forbidden | 403 (Co-op reducer authoritative) | 403 (Co-op reducer authoritative) | 200 OK (Emergency snapshot) | 401 / 403 / 409 |
| 6 | `POST /api/households/[id]/lease` | 401 | 403 Forbidden | 403 (Single-player route only) | 200 OK (Single-player route) | N/A | 401 / 403 / 409 |
| 7 | `POST /api/households/[id]/recover` | 401 | 403 Forbidden | 403 Forbidden | 200 OK | 200 OK | 401 / 403 / 409 |
| 8 | `POST /api/households/[id]/export` | 401 | 403 Forbidden | 200 OK (Read save JSON) | 200 OK | 200 OK | 401 / 403 |
| 9 | `POST /api/households/[id]/restore` | 401 | 403 Forbidden | 403 Forbidden | 200 OK (Owner only) | 200 OK | 401 / 403 / 409 |
| 10 | `POST /api/households/[id]/invites` | 401 | 403 Forbidden | 403 Forbidden | 201 Created (Token issued) | Allowed | 401 / 403 |
| 11 | `POST /api/invites/redeem` | 200 OK (Valid token) | 200 OK (Valid token) | 409 (Already in household) | 409 (Already owner) | N/A | 401 / 404 / 410 |
| 12 | `POST /api/households/[id]/members/[id]/revoke` | 401 | 403 Forbidden | 403 Forbidden | 200 OK (Cannot revoke self) | Allowed | 401 / 403 / 400 |
| 13 | `GET /api/households/[id]/coop/stream` | 401 | 403 Forbidden | 200 text/event-stream | 200 text/event-stream | 200 text/event-stream | 401 / 403 |
| 14 | `POST /api/households/[id]/coop/command` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 / 422 |
| 15 | `POST /api/households/[id]/coop/tick` | 401 | 403 Forbidden | 409 (Unless Host) | 409 (Unless Host) | 200 OK | 401 / 403 / 409 |
| 16 | `POST /api/households/[id]/coop/heartbeat` | 401 | 403 Forbidden | 409 (Unless Host) | 409 (Unless Host) | 200 OK | 401 / 403 / 409 |
| 17 | `POST /api/households/[id]/coop/lease/claim` | 401 | 403 Forbidden | 200 OK (If expired) / 409 | 200 OK (If expired) / 409 | 200 OK | 401 / 403 / 409 |
| 18 | `POST /api/households/[id]/coop/lease/release` | 401 | 403 Forbidden | 409 (Unless Host) | 409 (Unless Host) | 200 OK | 401 / 403 / 409 |
| 19 | `POST /api/households/[id]/coop/pause` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 |
| 20 | `POST /api/households/[id]/coop/resume` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 |
| 21 | `POST /api/households/[id]/cats/[id]/reassign` | 401 | 403 Forbidden | 200 OK (Custody transfer) | 200 OK (Custody transfer) | Allowed | 401 / 403 / 422 |
| * | `POST /api/test/*` (Diagnostic hooks) | 404 Not Found | 404 Not Found | 404 Not Found | 404 (Disabled in prod) | 404 (Disabled in prod) | 404 (Gated by secret & dev) |

---

## 3. TypeScript Domain & Selector Contracts

```ts
// src/domain/coop-state.ts

export type FamilyRole = 'owner' | 'family_member';
export type PastelColorTheme = 'coral' | 'lavender' | 'mint' | 'amber';

export interface FamilyMember {
  userId: string;
  displayName: string;
  role: FamilyRole;
  colorTheme: PastelColorTheme;
  joinedAt: string;
}

export interface ActorPresence {
  userId: string;
  sessionId: string;
  displayName: string;
  colorTheme: PastelColorTheme;
  selectedCatId?: string;
  cursor?: { x: number; y: number };
  lotId: string;
  isActive: boolean;
  isHost: boolean;
  lastHeartbeat: string;
}

export interface CoopSessionState {
  householdId: string;
  members: FamilyMember[];
  presence: Record<string, ActorPresence>; // userId -> Presence
  hostUserId: string;
  leaseEpoch: number;
  leaseExpiresAt: string;
  isPaused: boolean;
  pausedBy?: { userId: string; displayName: string };
  lastCommandSeq: number;
}

export interface CoopGameView extends GameView {
  coop: {
    enabled: boolean;
    members: FamilyMember[];
    activePresence: ActorPresence[];
    selectedCatByActor: Record<string, { catId: string; colorTheme: PastelColorTheme }>;
    isPaused: boolean;
    pausedByDisplayName?: string;
    isHost: boolean;
    hostDisplayName: string;
    failoverStatus?: 'healthy' | 'reconnecting_host';
  };
}
```

---

## 4. Conflict Resolution & Concurrency Invariants

1. **Cat Direct Care Arbitration**:
   - Both players can freely inspect, follow, or view any cat.
   - If Mom commands "Groom" and Daughter commands "Feed" to Mochi at the same moment:
     - The command with earlier `cmd_seq` in `coop_commands` is accepted and assigned to Mochi's action queue.
     - The subsequent command evaluates Mochi's busy status. If compatible, it queues; if conflicting, it rejects gracefully with user feedback toast: *"Mochi is currently busy with Mom"*.
     - Neither player is forcibly made a spectator.

2. **Building & Furniture Placement**:
   - Grid cell placement enforces atomic CAS on `world.build.cells[x][y]`.
   - The earlier committed sequence claims cell occupancy.
   - The later conflicting placement fails validation; the item remains in the catalog/inventory and no coins are deducted. Toast: *"Cell occupied"*.

3. **Wallet Balance & Purchases**:
   - Server transaction validates current balance before applying expenditure.
   - If concurrent purchases exceed funds, the second transaction fails with `INSUFFICIENT_FUNDS` toast. The wallet balance never drops below zero.

4. **Moo-Moo Romance, 4-Cat Player Cap & 8-Cat Household Limit (R20, R21, R26, R27)**:
   - Enforces two-tier capacity invariant: $\le 4$ living/reserved cats per player ($F_{\text{mom}} \le 4, F_{\text{daughter}} \le 4$), and $\le 8$ total living/reserved cats in the household.
   - Available capacity $F_{\text{household}} = (4 - (\text{living}_D + \text{reserved}_D)) + (4 - (\text{living}_S + \text{reserved}_S))$.
   - If $F_{\text{household}} > 0$, an eligible completed Moo-Moo rolls 25% conception chance and clamps litter size to $F_{\text{household}}$.
   - Reserved slots are assigned at conception using Dam-primary with partner-overflow allocation (`assignedMemberId: 'mom' | 'daughter'`).
   - If $F_{\text{household}} == 0$, conception roll is bypassed (0 PRNG draws consumed), and Moo-Moo completes as affectionate social interaction only.
   - At birth, reserved slots convert atomically to living cats assigned to their allocated player; no silent reassignment, eviction, or deletion can ever occur.

5. **Shared Household Goals (18 Goals)**:
   - All 18 goals evaluate shared canonical domain events recorded in the simulation stream.
   - Both players contribute to and see goal progress in real time. Completed goals award shared coins and unlocks to the household account atomically.
