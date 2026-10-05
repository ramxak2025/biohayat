# Codex development workflow

Read this before development, delegation, review or changes to this workflow. This is a standing project workflow, not a request to rerun setup or launch every role on every task. A direct user instruction can narrow or change the current task.

## Scope and priorities

Correctness and security precede requirements compliance, then architectural integrity and maintainability, speed and resource savings. Avoid repeated reads, unnecessary parallelism and mechanical effort; preserve reasoning and verification where errors are costly. Do not invent requirements or expand scope to unrelated fixes.

The root `AGENTS.md` retains the Next.js documentation requirement. Before writing Next.js code, read relevant installed guides in `node_modules/next/dist/docs/`. For `mobile/`, also follow `mobile/AGENTS.md` and its Expo versioned documentation requirement. Check for applicable overrides before editing.

## Roles and routing

| Role | Model / effort | Responsibility |
| --- | --- | --- |
| Main session / orchestrator | `gpt-6-astra` / `max` | Requirements, architecture, risk, task assignment, escalation, integration, final acceptance |
| `engineer` (default) | `gpt-6.1-sol` / `xhigh` | Ordinary features, UI, API, business logic, integrations |
| `critical_engineer` | `gpt-6-astra` / `max` | Auth/access, tenant/user isolation, payments, migrations, data integrity, races, synchronization, systemic defects |
| `qa` | `gpt-6.1-sol` / `xhigh` | Independent checks designed from requirements and contracts |
| `qa_critical` | `gpt-6-astra` / `max` | Independent testing of critical scenarios |
| `reviewer` | `gpt-6-astra` / `max` | Independent read-only review of actual changes and evidence |
| `routine` | `gpt-6-luna` / `high` | Bounded search, maps, documentation and mechanical edits from a settled example |

The orchestrator is the main session configured in `.codex/config.toml`, not another manager subagent. It may research or implement critical code directly when handoff would reduce reliability. It delegates safe mechanical work and remains responsible for final acceptance.

Role definitions are discovered from `.codex/agents/*.toml`. `qa_critical` is separate because a role's explicit model/effort can override spawn settings: do not invoke the Sol `qa` file and assume a spawn override changes it to Astra. For any tool without named-role selection, read the intended file and pass explicit model/effort plus its instructions and a focused brief. With the current collaboration tool use `fork_turns="none"` for explicit overrides; full-history forks inherit the parent's model/effort. Never claim that naming a task loads its TOML or enforces its sandbox.

Check the client's model catalog and launch metadata. If an effort is unsupported, choose the closest supported level and disclose the replacement. If a model is unavailable, report it; do not imitate it. Critical Astra roles must not be downgraded without user consent. A successful launch request or model catalog is not inference telemetry; record the strongest evidence the client actually exposes.

## Scheduling and ownership

- Only the main session spawns and assigns agents. No recursive delegation or additional managers. Maximum three simultaneously open children, excluding the main session. Finish/close completed agents promptly using available lifecycle tools. If there is no close tool, let them finish, avoid accumulating replacements and disclose this limitation; do not invent a closed status.
- Launch only useful roles. A small nonbehavioral change can be handled with focused checks; substantial behavior changes need implementation, independent QA and independent review. QA/reviewer must not be the author acting as their own independent check.
- Parallelize independent reading or genuinely independent isolated work. In the shared checkout one writer at a time, including test authors and commands producing generated files. Parallel writes require confirmed isolated worktrees and a clear integration order.
- Give shared types, contracts, schemas, dependencies and lockfiles one named owner. Finalize and communicate contract changes before implementing consumers. Integrate deliberately, then verify the combined state.

## Task protocol

1. Read the request, relevant code and docs; establish desired behavior without inventing product decisions. Inspect Git and retain user changes.
2. State acceptance criteria, compatibility constraints, invariants and risks. Choose the simplest complete solution consistent with existing architecture; avoid infrastructure for hypothetical future needs.
3. Identify and run relevant baseline checks before editing where feasible; distinguish existing failures from regressions. Plan behavior checks from requirements before implementation is complete.
4. Assign by risk and uncertainty, not diff size. A one-line authorization change belongs with Astra. Give the executor sufficient focused context rather than the entire chat history.
5. Integrate implementation, require applicable QA and separate review, resolve material findings with fixes or explicit evidence, then rerun affected checks on the final state.

Every brief must specify:

```text
Role; objective and expected behavior:
Relevant files, symbols, contracts and baseline:
Allowed files / writer ownership:
Constraints, forbidden changes and compatibility:
Acceptance criteria and verification method:
Dependencies and integration order:
```

Executors must return unexpected contract changes or scope expansion to the orchestrator. No silent expansion, dependency upgrades, unrelated cleanup or changes to product policy.

## Escalation and implementation

Routing is routine → engineer → critical_engineer/orchestrator. Skip steps immediately for high risk, architectural uncertainty, invalid assumptions or shared-contract decisions. Do not make a weaker model fail first on known critical work.

For ordinary obstacles, allow at most two meaningful hypothesis → fix → verify cycles without progress, then return `BLOCKED`. This is an instruction, not a programmed counter. Handoffs include current changes, reproduction and exact error, expected/actual results, tested hypotheses and attempted fixes with results. Continue from evidence already gathered.

Missing credentials, access, dependencies, server, emulator or permission are environment blockers, not reasons for more expensive model retries. Report the needed action without exposing secrets.

Fix root causes. Follow project architecture, style, types, dependency management and backward compatibility unless the task requires a change. Do not disable checks/protections, introduce unjustified `any`, suppressions or empty catches, use production mocks as functionality, or weaken assertions to make incorrect code pass. Routine edits need stronger-agent verification.

Do not publish, deploy to production, run destructive migrations, delete data, force-push or perform other hard-to-reverse actions without separate explicit user authorization. Preserve existing login/billing and sandbox/permissions. Do not add API keys, routers or services or edit global settings for other projects. Do not expose secrets in prompts to workers, logs, reports or commits.

## Verification and acceptance

QA derives checks from requirements/contracts and seeks cases the author missed. As applicable cover happy path, boundaries, invalid inputs, network errors/timeouts/retries, access isolation, concurrency, repeated operations/idempotency, client/server compatibility and regressions. UI needs loading/empty/error/success states; mobile needs relevant iOS/Android differences.

Use appropriate existing type, lint, unit, integration, E2E, build and smoke checks. A build or typecheck is not proof of behavior. Add regression tests when practical, and demonstrate they detect the original bug using a safe isolated baseline/reproduction, never by resetting user work.

Give the reviewer requirements, the actual scoped diff and check results, not just the author's explanation. The reviewer independently inspects related code and returns severity, file:line, triggering scenario, impact and verification method. It does not edit the reviewed implementation. Its role requests `sandbox_mode="read-only"`; tool/platform limitations must be disclosed. Do not use external tools to bypass read-only intent.

Resolve all material findings or explicitly adjudicate them with evidence. After fixes/integration verify the final state; old test results do not cover later changes. Agreement among models cannot replace checks.

Done requires criteria satisfied, implementation integrated, required final checks and independent review completed, no unresolved correctness/security blockers and explicit residual limitations. If a mandatory check is impossible: “implementation complete, verification blocked”, with the exact blocker.

Worker report: `DONE` / `BLOCKED` / `NEEDS_REVIEW`; changed files; work performed; commands actually run and results; remaining risks/blockers. Keep logs concise, retain material errors. User report: changes, checks, unverified items and required actions before release. Never invent token savings, costs or test/review results.

## Project commands and boundaries

Inventory established on 2026-10-05; recheck manifests/configuration when working on a relevant change.

- Root: Next.js 16.2.6, React 19.2.4, TypeScript 5.9.3 installed/locked, Prisma 6.19.3, pnpm 10.33.0. Mobile: Expo 57.0.23, React Native 0.86.3, TypeScript 6.0.3; its lockfile is npm's `package-lock.json`.
- Root lint: `pnpm lint` (check its actual scope first). Root typecheck: `pnpm exec tsc --noEmit --incremental false`. Root build: `pnpm build`, which produces `.next` output and may need database/environment access. Mobile typecheck: from `mobile/`, `npx --no-install tsc --noEmit --incremental false`. Mobile lint: `npm run lint` from `mobile/`; inspect Expo lint setup before use because first-run setup may install/configure ESLint.
- Neither manifest currently provides a `test` script or `typecheck` script; no dedicated unit/integration/E2E test suite was found. Playwright is installed at root, which alone does not establish an E2E suite.
- `pnpm check:auth` contacts a live site and can update a test customer's `lastLoginAt`; it is not a read-only baseline command. Use an authorized test environment. `db:push`, `db:seed` and `db:import-photos` mutate data. Do not run them just to validate workflow setup.
- Setup changes only Codex configuration and instructions. Application lint/build/typechecks need not be run for documentation-only workflow changes. Validate TOML and effective client configuration, inspect the scoped diff and perform bounded read-only delegation instead.

## Activation and evidence

Project configuration sets new-session defaults; it does not prove or change the running chat's model. Start a fresh chat in this project and explicitly select Astra with effort Max if the UI has retained another selection. From CLI: `codex -C /Users/ramazan/Proects/Hayat -m gpt-6-astra -c 'model_reasoning_effort="max"'`. Project config requires a trusted project; preserve existing trust rather than changing global policy.

Record setup verification separately in `docs/codex-setup-verification.md`. Re-run setup only if the client/configuration changes or evidence of a problem requires it.

Format references: [OpenAI subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents), [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). Installed client parsing and runtime metadata take precedence over assuming an example or catalog entry proves execution.
