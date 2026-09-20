# Cats implementation contracts

This document is an index to the detailed behavioral contracts in [Architecture](architecture.md). All technical choices are proposed engineering defaults, not quotes of founder decisions. No application code exists at planning completion.

## Proposed file responsibilities

| Path | Responsibility |
|---|---|
| src/app/game/page.tsx | Authenticated game entry; client renderer is mounted below this boundary. |
| src/features/world/GameCanvas.tsx | Client-only Pixi lifecycle, input translation, resizing and renderer recovery. |
| src/features/ui/GameShell.tsx | Accessible DOM HUD, dialogs, mobile sheets and keyboard routes. |
| src/domain/state.ts | Versioned WorldState and stable IDs; no rendering or network imports. |
| src/domain/commands.ts | Typed GameCommand union and atomic dispatch entrypoint. |
| src/domain/simulation.ts | Fixed-step advance, scheduling and persisted seeded RNG. |
| src/domain/selectors.ts | Read-only GameView for UI; rendering never changes the world. |
| src/domain/invariants.ts | Capacity, identity, inventory, money, ownership and pregnancy invariants. |
| src/features/saves/SaveCoordinator.ts | Local checkpoints, cloud revisions, lease heartbeat and conflict handling. |
| src/server/access.ts | Verified identity and private membership checks for every route. |
| src/server/saves.ts | Transactional revision/lease/idempotency checks and immutable recovery copies. |
| src/content/balance.ts | Fixed engineering constants and content data; no player lifespan option. |
| tests/support/scenario.ts | Browser fixture setup in test environments only. |
| tests/support/domain.ts | Deterministic domain scenario factory and clock control. |
| tests/e2e/*.spec.ts | Real browser command workflows and reload assertions. |
| tests/integration/*.spec.ts | Real test database/auth boundary, transactions and owner isolation. |

## Exact integration names

```ts
export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };
export type CommandContext = { actorId: string; commandId: string };
export function dispatch(state: WorldState, command: GameCommand, context: CommandContext): CommandResult;
export function advance(state: WorldState, elapsedSimMinutes: number): WorldState;
export function selectView(state: WorldState): GameView;
```

These are declarations to implement, not working code. WorldState contains stable household/cat/lot/object IDs, simMinute, persisted RNG state, queued actions, relationship/family records, capacity reservations, wallet/inventory, careers, businesses, memories and deaths. The architecture document specifies the fields and transitions. Feature modules extend the typed command union and schema deliberately; they cannot mutate state from a React effect or Pixi animation callback.

## Server authority boundary

CommandContext is a local simulation input, not authorization. Never accept it as proof of identity or writer ownership. The save route first obtains verified identity from the auth session, checks private membership and household ownership, and then performs the lease/revision/idempotency checks in one database transaction. Only that server layer may commit a cloud snapshot.

```ts
export type SaveRequest = {
  requestId: string;
  expectedRevision: number;
  lease: { sessionId: string; epoch: number };
  envelope: SaveEnvelope;
};
export type SaveReceipt = {
  requestId: string;
  revision: number;
  checksum: string;
};
```

The household ID comes from the route, authenticated subject from the server, and lease ownership from a stored server record. Compare the request's epoch/session/expiry to that record and its expectedRevision to the stored revision. A matching previously committed requestId returns its stored receipt before a new write; a reused requestId with a different payload is rejected. Ownership is always checked before an idempotent receipt is returned. A takeover increments the stored epoch and makes all old writer requests fail with 409. The client cannot rescue a rejected write by changing an actorId, ownerId or leaseEpoch inside its JSON.

## Persisted facts used by acceptance tests

Add `GET /api/households/[id]/view`, authenticated and owner-checked like the save route. It reads the latest COMMITTED cloud snapshot and applies the production `selectView` projection. It accepts no fixture/expected-result data and does not read browser state. This is also the read-only resume/observer projection used by a second device, not a test-result endpoint. Return `{ revision, checksum, view }`; a new browser context must see the same values after an acknowledged save.

GameView exposes versioned, named facts for user-visible state: household identity/name/livingCount/reservedSlots, selected-cat details, cats by stable ID, lot topology and objects, wallet, inventory, skills, careers, goals, relationships, pregnancies, family, deaths, memorials, businesses, tutorial and settings. Runtime-only selection need not persist; commands in acceptance fixtures target stable IDs explicitly. The task's assertions below define exact projection keys to add and maintain, with typed tests for selectView against a real saved world. No selector may return a success constant based on the scenario name.

`openScenario(page, name)` returns `{ householdId: string }`. `readCommittedView(page, householdId)` performs a real authenticated GET of the view route and throws on non-200. Its generic type is `{ revision: number; checksum: string; view: GameView }`. `waitForCommit(page, householdId, previousRevision)` polls that route until revision increases or fails within ten seconds. The test setup loads initial data only once; ordinary reloads and new contexts must never reset the world. The user's normal session and cloud round-trip remain active in all browser checks.

Acceptance fixtures start paused except where the scenario explicitly exercises time. Before a stable checksum/reload assertion, pause through the actual game control and wait until the latest local state is cloud-acknowledged. Tests involving actions over time must resume, wait for the specified domain outcome, then pause and settle before reading the final view. The named fixture's catalog uses the prices and IDs shown in its test; its starting state cannot already contain the expected newly created object, payment or event. Never add an end-user control merely to satisfy a test label: adapt the test to the equivalent real action, such as selecting a world destination through the canvas or accessible interaction menu.

## Browser test seam

Implement `openScenario(page: Page, name: string): Promise<void>` in tests/support/scenario.ts. It creates a deterministic fixture in a dedicated test account through a test-only backend setup handler and opens the real game route. The name resolves a versioned fixture registry, not a mocked response. Production builds must not register this handler, expose fixture controls, or accept a fixture query parameter. Test authorization is checked server-side, not by hostname alone. Assertions use accessible roles for actions and a small stable set of test IDs for game state. A passing label test is a starting regression test, not proof of the whole ticket.

Domain tests invoke dispatch/advance with fixed seeds, then assert state, emitted events and invariants. Integration tests call real route handlers with test identities and an isolated database. Browser dogfooding proves renderer input, navigation, touch, audio and actual visual behavior which domain tests cannot establish.

## Commands to establish in the first ticket

- `npm run test:domain -- <file>`: Vitest, selected headless behavior tests.
- `npm run test:integration -- <file>`: isolated real-database route tests.
- `npm run test:e2e -- <file> --project=desktop`: focused Playwright browser case.
- `npm run test:e2e -- <file> --project=phone`: focused touch case.
- `npm run typecheck`, `npm run lint`, `npm run build`: repository-only validation.
- `python3 scripts/validate_plan.py all`: planning artifact checks, available now.

The application commands above do not exist yet. Ticket 01 must create and verify them. Never report them passing from this planning package. Heavy full suites should run in CI or a dedicated validation environment; do not launch broad machine-wide tests or unsolicited app windows on the founder's working computer.
