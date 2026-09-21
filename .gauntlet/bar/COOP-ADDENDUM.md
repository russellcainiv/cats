# Cats Gauntlet — Private Family Co-Op Addendum

This document defines the **additive verification gates** for the Private Family Co-Op extension (Requirement R26, Tasks 33–38).
It **appends to and strictly reinforces** the frozen acceptance bar defined in `.gauntlet/bar/BAR.md`.
The original 10 hard gates in `BAR.md` remain completely intact, frozen, and mandatory.

---

## Additive Co-Op Hard Gates

### Gate 11: True Simultaneous Two-Device Interaction & Parity
- **Standard**: Both players (Mother on desktop/laptop, Daughter on phone/tablet) must be able to issue simultaneous commands (e.g. directing two different cats, grooming, feeding, purchasing furniture) and see state updates reflected on both screens in real time (< 200ms latency on local Wi-Fi / broadband).
- **Disallowed**: Any implementation where the second device is merely a read-only spectator, or where taking an action on one device locks or disables the controls on the second device.
- **Physical Verification**: Playwright dual-context tests and human dogfooding with two active windows: Desktop (1280x800) and Phone (390x844 with simulated touch events).

### Gate 12: Invariant Preservation Under Concurrency
- **Standard**: Under extreme concurrent input, the simulation invariants must never be violated:
  1. **8-Cat Capacity**: `livingCount + sum(reservedLitterSlots) <= 8`. Concurrent Moo-Moo completions or adoptions must never exceed 8 living cats or create orphan litter reservations.
  2. **Career Clothing**: Outfits (apron, overalls, smock) must appear on both viewports when a cat leaves for work, survive reload and re-join, and cleanly restore to default fur/accessories on return.
  3. **Death Permanence & Memorials**: Death warnings must fire simultaneously on both screens. Terminal death results in an immutable memorial on both devices; ghosts remain non-resurrecting projections.
  4. **Economy Provenance**: Concurrent purchases must deduct funds atomically with CAS check. No duplicate object minting or negative wallet balances. Free-build mode edits must preserve `free-build-provenance` across all connected clients.
  5. **Canonical Goal Completion**: All 18 goals evaluate real committed events from the shared simulation stream, updating progress for both players simultaneously.

### Gate 13: Instant Cooperative Pause & Strict Zero-Advance Invariant
- **Standard**:
  1. Tapping Pause on *either* device must immediately halt the simulation on *both* devices.
  2. A clear, gentle banner must indicate who paused (*"Paused by Daughter"* or *"Paused by Mom"*).
  3. While paused, all decay of needs, aging minutes, work shifts, and pregnancy timers must be strictly zero (0.00 sim delta).
  4. When both devices background their tabs (`visibilitychange: hidden`), lock screens, or disconnect, the household simulation must halt immediately. Upon reconnecting 5 minutes, 5 hours, or 5 days later, exactly zero sim minutes must have elapsed. No offline catch-up, no unattended death, no missed careers.

### Gate 14: Dynamic Host Failover & Resilient Reconnection
- **Standard**:
  1. If the current host device cleanly navigates away or pauses, host lease is released immediately, allowing the peer to acquire host authority in < 1 second.
  2. If the current host crashes, loses power, or closes abruptly without clean release, its 10-second `sim_lease` expires. The surviving device must cleanly acquire the host role via atomic CAS within a realistic 10–12 second failover window, displaying an honest reassuring status pill and resuming simulation without freezing, crashing, or rolling back progress.
  3. A disconnected device that reconnects must fetch the current snapshot and uncommitted command backlog via `Last-Event-ID`, re-establishing visual and domain synchrony within 1.5 seconds.
  4. No desynchronization between clients may persist after uncommitted commands have settled.

### Gate 15: Child-Safe Privacy & Private Link Security
- **Standard**:
  1. No child personal information (date of birth, age, school, phone number, real name, or email) may ever be collected, required, stored, or prompted during account creation, invite redemption, or gameplay.
  2. Invite links are generated strictly by the household owner, hashed at rest with SHA-256, limited to single-use and 72-hour expiration, and displayed in the UI for private out-of-band sharing (AirDrop, message, local copy). They must never be emailed, sent to external analytics, or registered in public directories.
  3. No public matchmaking, stranger lobby, player directory, open chat, or public discovery features exist.
  4. Revocation by the owner immediately disconnects the secondary session and invalidates all session tokens for that household.

---

## Physical Device Verification Protocol

Before final acceptance of Task 38 and co-op release:
1. **Device Matrix**:
   - Primary: MacBook / Desktop Chrome or Safari (Pointer/Keyboard).
   - Secondary: iPhone / iPad Safari or Android Chrome (Touch).
2. **Recorded Scenarios**:
   - Simultaneous Care: Mom feeds Cat 1, Daughter pets Cat 2 at the exact same moment.
   - Building Collaboration: Mom places a rug, Daughter places a cat bowl inside the same room simultaneously.
   - Host Dropped: Daughter is playing, Mom closes laptop lid; Daughter's screen displays seamless failover status, and game continues without interruption.
   - Dual Disconnect & Pause Verification: Both close devices for 10 minutes; on reopen, timestamp and sim minute match exactly the moment of closure.
