<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Codex workflow for Hayat

- Priority: correctness/security → requirements → architecture/maintainability → speed → resource savings. Save on redundant work, not critical decisions or verification.
- Before development, delegation, review, or changing this workflow, read `docs/codex-workflow.md` once per context. Re-read relevant sections when scope/risk changes. Check applicable nested `AGENTS.md` / `AGENTS.override.md`; preserve framework-specific instructions, including `mobile/AGENTS.md`.
- Main session: `gpt-6-astra` / `max`. Default developer: `engineer`, `gpt-6.1-sol` / `xhigh`. Use `critical_engineer` (Astra/max) immediately for high-risk work. `qa` is independent Sol/xhigh; use `qa_critical` (Astra/max) for critical scenarios. `reviewer` is independent Astra/max, read-only. `routine` is Luna/high for bounded mechanical work only.
- Use native subagents directly from the main session; children must not delegate. At most three open subagents, excluding the main session. Close completed agents when the client supports it; otherwise finish/stop them and report the limitation. Do not use user-visible chats as substitute workers.
- Select named roles when supported. If the spawn tool has no role selector, read the role file, pass its scoped instructions and explicit model/effort without full-history inheritance. Report any unavailable technical restriction (especially read-only); a task name alone does not load a role. Do not downgrade critical Astra roles without user consent.
- Use one writer at a time in a shared checkout, including QA/generated files. Parallel writers require verified isolated worktrees and an integration order. Assign one owner to shared types, API contracts, schemas, dependencies and lockfiles; settle contracts before consumer work.
- Before changes: define behavior, acceptance criteria, invariants, compatibility, risks and relevant check baseline. Delegate with scope, constraints, evidence and dependencies. Return scope/contract expansion to the orchestrator.
- Small changes without behavior changes do not need the full team. Substantial behavior changes require implementation, requirement-based testing and independent review of the actual final diff, including when Astra wrote it.
- Escalate immediately on risk/uncertainty. For ordinary difficulties, after two meaningful unsuccessful hypothesis/fix/check cycles return `BLOCKED` with evidence. This is a workflow rule, not an enforced runtime counter.
- Preserve user changes and secrets. Fix causes; do not disable tests/types/security, add unjustified suppressions or ship placeholders. Avoid unrelated refactors/dependencies. Publication, production deploy, destructive migrations, data deletion and force-push need separate explicit user authorization.
- Report actual checks and limitations. Recheck the integrated result after fixes; if a required check is unavailable, say “implementation complete, verification blocked”. Never infer model execution from TOML or an agent's self-description.
