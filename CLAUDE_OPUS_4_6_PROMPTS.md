# Claude Opus 4.6 Prompts

ใช้ไฟล์นี้เมื่อคุณจะไปเปิดงานต่อใน Claude Code ด้วย Opus 4.6

ไฟล์อ้างอิงที่ทุก session ต้องอ่านก่อน:

- `/Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md`
- `/Users/sakdithat/vps-first-app/AGENT_ASSIGNMENTS.md`
- `/Users/sakdithat/vps-first-app/AGENT_HANDOFF_PLAN.md`

บริบทล่าสุดของ workspace ตอนนี้:

- `main` ถูก reset กลับเท่ากับ `origin/main` แล้ว แต่ local refactor ทั้งก้อนยังอยู่ใน working tree
- PM แก้ blocker รอบแรกแล้ว:
  - clear วันที่ใน create form ได้จริง
  - request list selection sync กันจริง
  - request list ใช้ shared confirm dialog แทน `window.confirm`
- foundation slice ลงมาแล้วใน `app/layout.tsx`, `app/globals.css`, `components/Providers.tsx`, `components/Navbar.tsx`, `components/modals/ErrorModal.tsx`, `components/ui/**`, `components/forms/**`
- admin slice ลงมาแล้วใน `app/admin/components/shared/FeedbackBanner.tsx`, `app/admin/components/shared/ErrorMessage.tsx`, `components/CreateUserForm.tsx` และไฟล์ admin table ที่เกี่ยวข้อง
- request-list slice ลงมาแล้วใน `components/PowerOutageRequestList.tsx`, `components/PowerOutageRequest/BulkActions.tsx`, `components/PowerOutageRequest/PrintService.tsx`
- create-flow CSV import UX ถูกขยับต่อแล้วใน `app/power-outage-requests/create/components/csv-import/CSVImport.tsx`

กติกากลางทุก session:

- ห้าม revert local changes ที่มีอยู่แล้ว
- ห้ามแก้นอก ownership ถ้าไม่จำเป็นจริง
- ถ้าจะเปลี่ยน shared primitive ให้ทำแบบ backward-compatible ให้มากที่สุด
- ห้ามกระโดดไป state ถัดไปถ้า state ปัจจุบันยังไม่ผ่าน exit criteria
- ทุก session ต้องสรุปผลกลับมาในรูปแบบนี้:
  - changed files
  - what changed
  - why
  - residual risks

## Prompt 0: Coordinator

ใช้ prompt นี้ถ้าจะให้ Opus 4.6 เป็นคนคุมหลาย session หรือหลาย subagents

```md
You are the PM/coordinator for a staged refactor in `/Users/sakdithat/vps-first-app`.

Before doing anything, read:
- `/Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md`
- `/Users/sakdithat/vps-first-app/AGENT_ASSIGNMENTS.md`
- `/Users/sakdithat/vps-first-app/AGENT_HANDOFF_PLAN.md`
- inspect the current working tree

Important baseline:
- The working tree is intentionally dirty because previous local commits were uncommitted for curation.
- Do not revert existing local edits.
- Current baseline already includes:
  - create-form date clear fix
  - request-list selection sync
  - shared confirm dialog in request list
  - foundation slice in layout/providers/navbar/shared UI/forms
  - admin feedback slice
  - request-list print/bulk feedback slice
  - CSV import UX improvements

Your job:
1. Split work across 4 worker sessions using the ownership and guardrails already defined in `AGENT_ASSIGNMENTS.md`.
2. Respect this execution order unless you find a concrete reason not to:
   - Agent A: UI Foundation
   - Agent B: Request Create Flow
   - Agent C: Request List And Bulk Operations
   - Agent D: Admin Domain
3. Keep each worker strictly inside its ownership.
4. Require each worker to build on top of the current working tree, not rewrite it.
5. Require each worker to return:
   - changed files
   - what changed
   - why
   - residual risks
6. After each worker finishes, review whether the slice is safe to keep or should be rejected.

Do not produce a fresh grand plan. Use the existing plan and drive execution.
```

## Prompt A: UI Foundation Finisher

```md
You are Agent A: UI Foundation owner.

Read these first:
- `/Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md`
- `/Users/sakdithat/vps-first-app/AGENT_ASSIGNMENTS.md`
- `/Users/sakdithat/vps-first-app/AGENT_HANDOFF_PLAN.md`

Skills to follow:
- `/Users/sakdithat/.agents/skills/frontend-design/SKILL.md`
- `/Users/sakdithat/.agents/skills/ui-ux-pro-max/SKILL.md`

Ownership/write scope only:
- `/Users/sakdithat/vps-first-app/app/layout.tsx`
- `/Users/sakdithat/vps-first-app/app/globals.css`
- `/Users/sakdithat/vps-first-app/components/Providers.tsx`
- `/Users/sakdithat/vps-first-app/components/Navbar.tsx`
- `/Users/sakdithat/vps-first-app/components/modals/ErrorModal.tsx`
- `/Users/sakdithat/vps-first-app/components/ui/**`
- `/Users/sakdithat/vps-first-app/components/forms/**`

Important context:
- A foundation slice has already landed in this workspace.
- This is now a finisher/reviewer pass, not a blank-slate redesign.
- Build on top of the current working tree. Do not revert or fight existing edits.

Your job:
- tighten any remaining inconsistencies in shared feedback patterns
- improve accessibility, hierarchy, and polish in shared loading/error/empty/success/confirm UI
- keep form primitives visually and behaviorally consistent
- avoid touching request-list, create-flow, or admin domain files

If the foundation already looks coherent, prefer a minimal hardening pass over broad redesign.

Return:
1. exact file paths changed
2. what you changed
3. why
4. residual risks
```

## Prompt B: Request Create Flow

```md
You are Agent B: Request Create Flow owner.

Read these first:
- `/Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md`
- `/Users/sakdithat/vps-first-app/AGENT_ASSIGNMENTS.md`
- `/Users/sakdithat/vps-first-app/AGENT_HANDOFF_PLAN.md`

Skill to follow:
- `/Users/sakdithat/.agents/skills/frontend-design/SKILL.md`

Ownership/write scope only:
- `/Users/sakdithat/vps-first-app/app/power-outage-requests/create/**`
- `/Users/sakdithat/vps-first-app/stores/powerOutageFormStore.ts`
- `/Users/sakdithat/vps-first-app/hooks/usePowerOutageForm.ts`
- `/Users/sakdithat/vps-first-app/lib/validations/powerOutageRequest.ts`

Important context:
- The current working tree already includes a fix for clearing outageDate in `ImprovedFormFields.tsx`.
- `CSVImport.tsx` already received a first UX pass. Review it and continue from there instead of rewriting it.
- Build on top of the current working tree. Do not revert or fight existing edits.

Your job:
- keep State 2 bounded and mergeable
- improve create-flow clarity, especially validation/status messaging
- refine CSV import result UX, partial-import guidance, and recovery flow
- reduce obvious concern mixing only where it materially improves maintainability

Do not touch shared foundation files unless absolutely required.

Return:
1. exact file paths changed
2. what you changed
3. why
4. residual risks
```

## Prompt C: Request List And Bulk Operations

```md
You are Agent C: Request List and Bulk Operations owner.

Read these first:
- `/Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md`
- `/Users/sakdithat/vps-first-app/AGENT_ASSIGNMENTS.md`
- `/Users/sakdithat/vps-first-app/AGENT_HANDOFF_PLAN.md`

Skills to follow:
- `/Users/sakdithat/.agents/skills/frontend-design/SKILL.md`
- `/Users/sakdithat/.agents/skills/web-design-guidelines/SKILL.md`

Ownership/write scope only:
- `/Users/sakdithat/vps-first-app/components/PowerOutageRequestList.tsx`
- `/Users/sakdithat/vps-first-app/components/PowerOutageRequest/**`
- `/Users/sakdithat/vps-first-app/components/UpdateRequesr.tsx`
- `/Users/sakdithat/vps-first-app/hooks/usePowerOutageRequests.ts`
- `/Users/sakdithat/vps-first-app/app/power-outage-requests/page.tsx`

Important context:
- The current working tree already includes selection sync and shared confirm dialog fixes.
- Print/bulk feedback has already started moving away from `alert()` in the current workspace.
- Build on top of the current working tree. Do not revert or fight existing edits.

Your job:
- keep State 3 bounded and mergeable
- refine empty/no-result/bulk-action feedback and action clarity
- continue reducing ad-hoc feedback in list/print/edit flows
- only rename `UpdateRequesr.tsx` if you can do it safely and completely

Do not touch shared foundation files unless absolutely required.

Return:
1. exact file paths changed
2. what you changed
3. why
4. residual risks
```

## Prompt D: Admin Domain

```md
You are Agent D: Admin Domain owner.

Read these first:
- `/Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md`
- `/Users/sakdithat/vps-first-app/AGENT_ASSIGNMENTS.md`
- `/Users/sakdithat/vps-first-app/AGENT_HANDOFF_PLAN.md`

Skills to follow:
- `/Users/sakdithat/.agents/skills/frontend-design/SKILL.md`
- `/Users/sakdithat/.agents/skills/ui-ux-pro-max/SKILL.md`

Ownership/write scope only:
- `/Users/sakdithat/vps-first-app/app/admin/**`
- `/Users/sakdithat/vps-first-app/app/api/action/User.ts`
- `/Users/sakdithat/vps-first-app/lib/services/user.service.ts`
- `/Users/sakdithat/vps-first-app/components/CreateUserForm.tsx` when needed for admin flow

Important context:
- An admin feedback slice has already landed in the current workspace, including `FeedbackBanner.tsx` and removing `alert()` from `CreateUserForm.tsx`.
- Build on top of the current working tree. Do not revert or fight existing edits.

Your job:
- keep State 4 bounded
- make admin success/error/confirm flows more consistent
- improve admin table and action feedback quality without broad data-layer rewrite
- if you touch row-level mutations, prefer feedback patterns that survive refetches

Do not touch request-list or create-flow files.

Return:
1. exact file paths changed
2. what you changed
3. why
4. residual risks
```

## Suggested Run Order

1. Run Prompt 0 in one Opus 4.6 coordinator session if you want central orchestration.
2. Otherwise open 4 Claude Code sessions and paste Prompt A-D separately.
3. Merge/review in this order:
   - A
   - B
   - C
   - D
4. Require every session to return `changed files / what changed / why / residual risks`.
5. Bring the results back here for PM review and regression control.
