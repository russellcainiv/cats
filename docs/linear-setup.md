# Linear setup and verification

Verified on 2026-09-20.

- Team: [Cats (CATS)](https://linear.app/rciv/team/CATS/overview).
- Project: [Cats Browser Game](https://linear.app/rciv/project/cats-browser-game-28162bce1f26/overview).
- Native repository mapping: `russellcainiv/cats` → Cats, bidirectional default.
- Existing unrelated repository mappings were preserved.
- All 37 published GitHub issues imported as CATS-1 through CATS-37. The Cats team list shows Backlog 37; the project overview now shows **Scope 37, Completed 0**.
- Bulk project assignment was completed from the Cats-only issue list: select all 37, Add to project, Cats Browser Game. Project overview verified the full count afterward.
- The imported specification displays all 32 implementation children, labels, title, body, and the GitHub cross-link. Native GitHub dependencies remain canonical; do not infer every relationship's sync coverage from title/body sync.
- Controlled two-direction test on CATS-37: changed its title in Linear to `Approve the playable phone composition [sync-verification]`; authenticated `gh api repos/russellcainiv/cats/issues/37 --jq .title` returned that exact temporary title. Restored the original title through GitHub using gh-axi. Linear's live issue then returned to `Approve the playable phone composition`. No verification suffix remains.
- No implementation issue was closed or marked complete.

## Executor guidance

Keep GitHub canonical for bodies, scope, labels and native prerequisites. Linear is the synced working view. Project assignment is Linear-specific; assign later new issues to Cats Browser Game after native import. This setup verifies creation/import, title/body display, label and parent-child import, and an actual bidirectional title round-trip. It does not claim every GitHub field has a Linear equivalent.

The exact approved picture is versioned in the public repository. Its main-branch URL resolves once the planning PR is merged. No game or backend has been deployed.
