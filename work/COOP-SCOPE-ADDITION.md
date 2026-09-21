# New user requirement: mother and daughter play together

User explicitly added: "I WANT TO ALSO MAKE IT SO HER AND HER DAUGHTER CAN PLAY TOGETHER".

Private family co-op is now required scope. Update (2026-09-20, FAMILY-GENETICS-DECISIONS-02.md): Shared household and simultaneous separate devices are now CONFIRMED by user, with up to 4 cats per player (8 household total). Remaining optional choices (shared vs segregated control; 45/45/10 vs 50/50 genetics) are retained as explicit engineering defaults.

Foundation immediate boundary: preserve real authentication, privacy, owner data isolation and durable saves. Avoid baking a permanent single-human restriction into the application. Existing single-writer lease remains a concurrency primitive to be adapted for co-op authority, not a reason to force the second family player into spectator mode. Do not implement an ad-hoc multiplayer transport until the concrete spec/ticket/authority model is published. Continue independent authentication, transaction safety, durable storage/recovery and validation work. No public matchmaking, chat or stranger access has been requested.

Core/world immediate boundary: retain all current gameplay, career clothing and8cat household invariant. Keep authenticated player intent separate from selected cat and house ownership; do not derive consent/social rules from player identity. Continue rendering/phone repairs and deterministic module integration. Shared-time/pause semantics need an explicit co-op extension, not silent removal of the original no-offline-progression promise.

The original frozen bar remains intact as history; co-op adds acceptance coverage and changes only explicitly incompatible single-player assumptions under this new user instruction. No module or game acceptance granted from the scope change.
