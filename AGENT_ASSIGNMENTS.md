# Agent Assignments

เอกสารนี้ใช้เป็น prompt กลางสำหรับแบ่งงานหลาย agent ตาม [REFACTOR_MASTER_PLAN.md](/Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md)

บริบทล่าสุดก่อนปล่อยงาน:

- main ถูก reset กลับมาเท่ากับ `origin/main` แล้ว
- local refactor ทั้งก้อนยังอยู่ใน working tree เพื่อค่อย ๆ คัด merge
- PM ได้แก้ blocker ชุดแรกแล้ว:
  - clear วันที่ใน create form ได้จริง
  - request list selection sync กันจริง
  - request list ใช้ shared confirm dialog แทน `window.confirm`
- ทุก agent ต้อง “build on top of current local working tree” และห้าม revert งานคนอื่น

## Working Rules

- อ่าน `REFACTOR_MASTER_PLAN.md` ก่อนเริ่มทุกครั้ง
- ห้ามแก้นอก ownership ถ้าไม่จำเป็นจริง
- ห้าม revert local changes ที่มีอยู่แล้ว
- ห้ามขยาย scope ไป state ถัดไปถ้า state ปัจจุบันยังไม่ผ่าน exit criteria
- ให้สรุปผลกลับมาทุกครั้ง:
  - changed files
  - what changed
  - why
  - residual risks

## Merge Order

1. Agent A: UI Foundation
2. Agent B: Request Create Flow
3. Agent C: Request List And Bulk Operations
4. Agent D: Admin Domain

---

## Agent A: UI Foundation

### Skills

- `frontend-design`
- `ui-ux-pro-max`

### Ownership

- `app/layout.tsx`
- `app/globals.css`
- `components/Providers.tsx`
- `components/Navbar.tsx`
- `components/modals/ErrorModal.tsx`
- `components/ui/**`
- `components/forms/**`

### Mission

- ปิด State 1 ให้แน่นขึ้นในส่วน shared shell และ shared primitives
- ทำ feedback patterns ให้ consistent ขึ้น: loading, error, empty, success, confirm
- ลดความกระจัดกระจายของ form primitives โดยไม่ไปรื้อ feature flow ใหญ่

### Guardrails

- อย่าแก้ `components/PowerOutageRequestList.tsx` หรือ `app/power-outage-requests/create/**`
- อย่า revert งาน local ที่มีอยู่แล้ว
- ถ้าต้องเปลี่ยน shared primitive ให้ทำแบบ backward-compatible เท่าที่ทำได้

### Claude Code Prompt

```md
You are Agent A: UI Foundation owner.

Read /Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md first and stay inside State 1.

Ownership/write scope only:
- /Users/sakdithat/vps-first-app/app/layout.tsx
- /Users/sakdithat/vps-first-app/app/globals.css
- /Users/sakdithat/vps-first-app/components/Providers.tsx
- /Users/sakdithat/vps-first-app/components/Navbar.tsx
- /Users/sakdithat/vps-first-app/components/modals/ErrorModal.tsx
- /Users/sakdithat/vps-first-app/components/ui/**
- /Users/sakdithat/vps-first-app/components/forms/**

Skills to follow:
- /Users/sakdithat/.agents/skills/frontend-design/SKILL.md
- /Users/sakdithat/.agents/skills/ui-ux-pro-max/SKILL.md

Important context:
- The current working tree already contains an in-progress refactor.
- Recent PM fixes already landed locally for request-list confirm flow and create-form date clearing.
- Build on top of the current working tree. Do not revert or fight existing edits.

Your job:
- tighten shared feedback patterns
- improve loading/error/empty/success/confirm affordances
- improve form primitive consistency without forcing a huge migration

Do not touch request-list domain files or admin domain files unless absolutely required by your owned shared primitives.

At the end, report:
1. exact file paths changed
2. what you changed
3. why
4. residual risks
```

---

## Agent B: Request Create Flow

### Skills

- `frontend-design`

### Ownership

- `app/power-outage-requests/create/**`
- `stores/powerOutageFormStore.ts`
- `hooks/usePowerOutageForm.ts`
- `lib/validations/powerOutageRequest.ts`

### Mission

- เดิน State 2 ต่อแบบ mergeable
- ลด prop-drilling/concern mixing ที่ยังเหลือใน create flow
- ทำ validation/status copy ให้เข้าใจง่ายขึ้น
- ทำ CSV import/status behavior ให้คนใช้เข้าใจสถานะมากขึ้น

### Guardrails

- preserve fix เรื่อง clear date ใน `ImprovedFormFields.tsx`
- อย่าแก้ shared UI foundation files
- อย่ารื้อ store/form architecture ใหญ่เกินจำเป็นในรอบเดียว

### Claude Code Prompt

```md
You are Agent B: Request Create Flow owner.

Read /Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md first and stay inside State 2.

Ownership/write scope only:
- /Users/sakdithat/vps-first-app/app/power-outage-requests/create/**
- /Users/sakdithat/vps-first-app/stores/powerOutageFormStore.ts
- /Users/sakdithat/vps-first-app/hooks/usePowerOutageForm.ts
- /Users/sakdithat/vps-first-app/lib/validations/powerOutageRequest.ts

Skill to follow:
- /Users/sakdithat/.agents/skills/frontend-design/SKILL.md

Important context:
- The current working tree already contains an in-progress refactor.
- PM already fixed outageDate clearing in ImprovedFormFields locally.
- Build on top of the current working tree. Do not revert or fight existing edits.

Your job:
- reduce obvious prop-drilling and concern mixing
- improve validation and status copy
- make CSV import/status behavior easier to understand
- keep the slice mergeable and bounded

Do not touch shared foundation files unless absolutely required.

At the end, report:
1. exact file paths changed
2. what you changed
3. why
4. residual risks
```

---

## Agent C: Request List And Bulk Operations

### Skills

- `frontend-design`
- `web-design-guidelines`

### Ownership

- `components/PowerOutageRequestList.tsx`
- `components/PowerOutageRequest/**`
- `components/UpdateRequesr.tsx`
- `hooks/usePowerOutageRequests.ts`
- `app/power-outage-requests/page.tsx`

### Mission

- เดิน State 3 ต่อบนฐานที่เพิ่ง fix ไปแล้ว
- เก็บ UX ของ empty/no-result/bulk action ให้ชัดขึ้น
- ถ้า safe ให้เปลี่ยน `alert()` ใน print flow ไปเป็น pattern ที่ consistent กว่าเดิม
- ลด orchestration burden ใน list ต่อแบบไม่รื้อแรง

### Guardrails

- preserve selection sync และ shared confirm dialog ที่เพิ่งแก้ไป
- อย่าแก้ shared foundation files ถ้าไม่จำเป็นจริง
- ถ้าจะ rename `UpdateRequesr.tsx` ให้ทำแบบครบ import path และอย่าพา scope บาน

### Claude Code Prompt

```md
You are Agent C: Request List and Bulk Operations owner.

Read /Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md first and stay inside State 3.

Ownership/write scope only:
- /Users/sakdithat/vps-first-app/components/PowerOutageRequestList.tsx
- /Users/sakdithat/vps-first-app/components/PowerOutageRequest/**
- /Users/sakdithat/vps-first-app/components/UpdateRequesr.tsx
- /Users/sakdithat/vps-first-app/hooks/usePowerOutageRequests.ts
- /Users/sakdithat/vps-first-app/app/power-outage-requests/page.tsx

Skills to follow:
- /Users/sakdithat/.agents/skills/frontend-design/SKILL.md
- /Users/sakdithat/.agents/skills/web-design-guidelines/SKILL.md

Important context:
- The current working tree already contains an in-progress refactor.
- PM already fixed request-list selection sync and moved request-list confirm flow to a shared ConfirmDialog locally.
- Build on top of the current working tree. Do not revert or fight existing edits.

Your job:
- improve empty/no-result/bulk-action UX
- reduce ad-hoc feedback in the request list
- if safe, replace remaining alert usage in print flow with a more consistent pattern
- keep the slice bounded and mergeable

Do not touch shared foundation files unless absolutely required.

At the end, report:
1. exact file paths changed
2. what you changed
3. why
4. residual risks
```

---

## Agent D: Admin Domain

### Skills

- `frontend-design`
- `ui-ux-pro-max`

### Ownership

- `app/admin/**`
- `app/api/action/User.ts`
- `lib/services/user.service.ts`
- `components/CreateUserForm.tsx` when needed for admin flow

### Mission

- เดิน State 4 แบบ bounded
- ปรับ admin flow ให้ consistent ขึ้นในเรื่อง confirm/success/error feedback
- เก็บ success alert ใน create user ให้ไปอยู่ใน pattern ที่ดีขึ้น
- ลด coupling UX ที่ชัดเจนโดยยังไม่รื้อ data layer ใหญ่เกิน scope

### Guardrails

- อย่าแตะ request list หรือ create flow
- อย่าเปลี่ยน shared foundation files เว้นแต่จำเป็นจริง
- ถ้าแตะ action/service ให้จำกัดเฉพาะที่จำเป็นต่อ UX/admin flow ที่กำลังแก้

### Claude Code Prompt

```md
You are Agent D: Admin Domain owner.

Read /Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md first and stay inside State 4.

Ownership/write scope only:
- /Users/sakdithat/vps-first-app/app/admin/**
- /Users/sakdithat/vps-first-app/app/api/action/User.ts
- /Users/sakdithat/vps-first-app/lib/services/user.service.ts
- /Users/sakdithat/vps-first-app/components/CreateUserForm.tsx when needed

Skills to follow:
- /Users/sakdithat/.agents/skills/frontend-design/SKILL.md
- /Users/sakdithat/.agents/skills/ui-ux-pro-max/SKILL.md

Important context:
- The current working tree already contains an in-progress refactor.
- Build on top of the current working tree. Do not revert or fight existing edits.

Your job:
- improve consistency of confirm/success/error flows in admin
- replace the create-user success alert with a more standard feedback flow if you touch that flow
- keep the slice bounded and mergeable

Do not touch request-list or create-flow files.

At the end, report:
1. exact file paths changed
2. what you changed
3. why
4. residual risks
```
