# Device and evidence matrix

This is the future game's acceptance procedure, not a statement that devices were tested during planning.

| Target | Required conditions | Evidence |
|---|---|---|
| Desktop Chrome | 1440×900 and keyboard-only core workflows | Browser/version, viewport, exact commit, walkthrough notes, before/after screenshots |
| Desktop Safari | Actual Safari on macOS, 1280×800 or larger | Same evidence; WebKit emulation is supplemental only |
| iPhone Safari | Physical iPhone, portrait and landscape, touch, on-screen keyboard, safe areas | Device/OS/browser, screen recording of care/build/Moo-Moo, screenshots and save resume |
| Android Chrome | Physical Android phone, portrait and landscape, touch and keyboard | Same evidence plus renderer/input recovery |
| Two-device continuity | One desktop and one physical phone, same allowed test identity | Saved revision/checksum on A; load same revision on B; takeover; A stale write rejected |

Use a private preview deployment with HTTPS and an isolated allowlisted test account. Never disable owner checks, add public registration, or use the recipient's real household to make a test pass. Do not send real invitations without the requested authorization.

For each target, complete: create cat, select and route around an obstacle, feed, autonomous care, build a room and door, buy/move/recolor/sell furniture, undo, free-build, visit shop/park/café, social acceptance and refusal, Moo-Moo at seven/eight capacity, family tree, career, hobby sale, café order, death warning/intervention, memorial visit, pause/resume, offline freeze/reconnect and save recovery. Faster deterministic fixtures are allowed for rare events; indicate that in evidence.

Store evidence under docs/evidence/<ticket>/<commit>/<device> with a manifest recording date, device/OS/browser, viewport, environment URL, exact commit, fixture/seed, inputs, expected/observed result, capture path, inspection notes and reviewer. Redact tokens and real recipient details. Open every image and inspect text, stacking, overlap, selection, hit targets and horizontal overflow.

Automated phone emulation covers 390×844 portrait and 844×390 landscape with touch enabled. It is an early regression gate, not a substitute for physical phone proof. If a physical device is unavailable, finish every other check and write `Needs physical <device> verification`; do not mark that target or full production acceptance passed. The remaining action is to run the same prepared preview and checklist on that device.

Proposed performance acceptance: full 8-cat home plus an active neighborhood scene, at least 30 furniture objects and the normal HUD; target stable 30 FPS or better on a representative supported physical phone, p95 input-to-feedback under 150 ms, no sustained monotonic memory growth during a 30-minute session, no save beyond the validated payload limit. Report actual hardware, sample duration, p50/p95 frame time and long tasks. Measure cold load on a named network profile; propose a 5-second playable target on Fast 4G and retain results when the target needs optimization. These are proposed engineering targets, not already observed results.
