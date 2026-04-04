# Agent Handoff Plan

เอกสารนี้ใช้สำหรับแตกงานให้หลาย agent เดินต่อจาก refactor ปัจจุบัน โดยตั้งใจให้ส่งต่อเข้า Claude Code / Sonnet หรือ agent อื่นได้ทันที

## Current Ground Rules

- ฐานอ้างอิงหลักคือ [REFACTOR_MASTER_PLAN.md](/Users/sakdithat/vps-first-app/REFACTOR_MASTER_PLAN.md)
- โค้ดตอนนี้อยู่บน `main` แต่ยังเป็น working tree ที่ยังไม่ commit
- ห้าม revert งานของ agent อื่น
- ให้แต่ละ agent อ่าน diff ปัจจุบันก่อนลงมือ
- ถ้าจำเป็นต้องแตะไฟล์ shared นอก ownership ให้ทำเฉพาะ minimal integration

## Already Fixed In Main Workspace

- create form: clear `outageDate` ได้จริงแล้ว
- request list: selection sync ระหว่าง header / row / mobile card กลับมาปกติ
- request list: เปลี่ยน `window.confirm` ไปใช้ shared `ConfirmDialog` แล้ว

## Recommended Agent Split

### Agent A: UI Foundation And Shared Shell

- Skill:
  - `/Users/sakdithat/.agents/skills/frontend-design/SKILL.md`
  - `/Users/sakdithat/.agents/skills/ui-ux-pro-max/SKILL.md`
- Ownership:
  - `app/layout.tsx`
  - `app/globals.css`
  - `components/Providers.tsx`
  - `components/Navbar.tsx`
  - `components/modals/ErrorModal.tsx`
  - `components/ui/**`
  - `components/forms/**`
- Goal:
  - ปิด State 1 ให้แน่นขึ้นในส่วน shared shell, feedback pattern, form primitives
- Focus:
  - ทำให้ loading / empty / error / success / confirm ใช้แนวเดียวกันมากขึ้น
  - เก็บ visual baseline ของ shell และ shared primitive ให้สม่ำเสมอ
  - อย่าไปรื้อ request/admin domain
- Do not touch:
  - `components/PowerOutageRequestList.tsx`
  - `app/admin/**`
  - `app/power-outage-requests/create/**`

### Agent B: Request Create Flow

- Skill:
  - `/Users/sakdithat/.agents/skills/frontend-design/SKILL.md`
- Ownership:
  - `app/power-outage-requests/create/**`
  - `stores/powerOutageFormStore.ts`
  - `hooks/usePowerOutageForm.ts`
  - `lib/validations/powerOutageRequest.ts`
- Goal:
  - เดิน State 2 ต่อแบบ bounded และ mergeable
- Focus:
  - ลด concern mixing ใน create flow
  - ทำ validation/status copy ให้สื่อสารง่ายขึ้น
  - ทำ CSV import UX ให้เห็น state ชัดขึ้น
  - รักษา fix เรื่อง clear date ที่มีอยู่แล้ว
- Do not touch:
  - `components/ui/**` นอกจากจำเป็นจริง
  - request list / admin files

### Agent C: Request List And Bulk Operations

- Skill:
  - `/Users/sakdithat/.agents/skills/frontend-design/SKILL.md`
  - `/Users/sakdithat/.agents/skills/web-design-guidelines/SKILL.md`
- Ownership:
  - `components/PowerOutageRequestList.tsx`
  - `components/PowerOutageRequest/**`
  - `components/UpdateRequesr.tsx`
  - `hooks/usePowerOutageRequests.ts`
  - `app/power-outage-requests/page.tsx`
- Goal:
  - เดิน State 3 ต่อ โดย build บน fix ที่เพิ่งทำไปแล้ว
- Focus:
  - ลด ad-hoc feedback ใน list flow
  - ปรับ empty / no-result / bulk-action behavior
  - ถ้าปลอดภัย ให้แทน `alert()` ใน print flow ด้วย pattern ที่สม่ำเสมอ
  - ถ้าจะ rename `UpdateRequesr.tsx` ให้ทำแบบมี import migration ครบ
- Known targets:
  - `components/PowerOutageRequest/PrintService.tsx`
- Do not touch:
  - shared foundation filesกว้าง ๆ
  - admin domain

### Agent D: Admin Domain

- Skill:
  - `/Users/sakdithat/.agents/skills/frontend-design/SKILL.md`
  - `/Users/sakdithat/.agents/skills/ui-ux-pro-max/SKILL.md`
- Ownership:
  - `app/admin/**`
  - `app/api/action/User.ts`
  - `lib/services/user.service.ts`
  - `components/CreateUserForm.tsx`
- Goal:
  - เดิน State 4 ต่อแบบเป็นโมดูลและลด coupling
- Focus:
  - รวม confirm / success / error flow ให้ consistent
  - แทน `alert()` ใน create user
  - ปรับ admin table toolbar / header / context ให้ชัดขึ้น
- Do not touch:
  - create flow
  - request list flow

## PM Rules For Every Agent

- ห้าม rewrite กว้างเกิน ownership
- ทุก agent ต้องรายงาน:
  - changed files
  - สิ่งที่แก้
  - เหตุผล
  - residual risks
- ถ้าเจอ dependency ข้าม ownership ให้หยุดที่ integration point และ note ไว้
- อย่าข้าม phase: State 1 foundation ต้องไม่น่าพัง ก่อนเร่ง State 4-5

## Suggested Execution Order

1. Agent A และ Agent C เดินคู่กัน
2. Agent B เดินตามได้ทันที แต่ห้ามรื้อ shared primitives
3. Agent D เดินแยกโดเมนได้ขนานกัน
4. หลังทุก agent ส่งกลับ ให้ PM review และรวมงานทีละ slice
