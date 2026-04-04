# Master Refactor Plan

เอกสารนี้ใช้เป็นแผน refactor รอบใหญ่ของโปรเจค โดยเน้น 4 เรื่องพร้อมกัน:

1. ปรับ UX/UI ให้รองรับการทำงานจริงมากขึ้น
2. ลดความซ้ำซ้อนของ component, state และ data flow
3. ทำให้โค้ดแบ่ง scope งานได้ชัด เพื่อส่งต่อหลาย agent ได้
4. มี checklist และสถานะที่ติดตามความคืบหน้าได้จริง

---

## Current Status

### Phase Overview

- [x] State 0: Discovery, audit และวางแผน refactor
- [ ] State 1: วางรากฐาน UI system และ layout กลาง
- [ ] State 2: Refactor flow สร้างคำขอดับไฟ
- [ ] State 3: Refactor flow รายการคำขอ, filter, bulk action
- [ ] State 4: Refactor flow ส่วน admin
- [ ] State 5: Refactor data/service/state architecture
- [ ] State 6: Hardening, testing, docs และ rollout

### Already Done

- [x] สำรวจโครงสร้าง repo ระดับ page, component, hooks, services, store
- [x] ตรวจ flow หลักของระบบ: `login`, `power-outage-requests`, `create`, `admin`
- [x] ระบุจุดเสี่ยงด้าน UX จากฟอร์มยาว, ตาราง, filter และ role-based flow
- [x] ระบุจุดเสี่ยงด้านสถาปัตยกรรมจาก state และ UI library ที่กระจายหลายแบบ
- [x] จัดทำเอกสารแผน refactor กลางฉบับนี้
- [ ] เริ่ม implementation ตาม phase

---

## Baseline Findings

### 1. UX/UI และ design language ยังไม่เป็นระบบเดียว

- มีการใช้ `Tailwind`, `Mantine`, `MUI`, `FontAwesome`, `Heroicons`, `react-icons` ปนกัน
- visual hierarchy ระหว่างหน้า `login`, `request list`, `create`, `admin` ยังไม่สอดคล้องกัน
- บาง interaction สำคัญยังใช้ emoji, `window.confirm`, และ alert style ที่ไม่สม่ำเสมอ
- responsive behavior ยังแก้แบบเฉพาะหน้า เช่น mobile detection ใน component

### 2. ฟอร์มหลักมีความซับซ้อนสูง แต่โครงสร้างยังแยก concern ไม่พอ

- หน้า `app/power-outage-requests/create/**` มีทั้ง form logic, fetch logic, business validation, list staging และ UX state
- ใช้ทั้ง `react-hook-form`, local state, Zustand store และ component state ร่วมกัน
- การแบ่ง section เริ่มดีขึ้นแล้ว แต่ยังไม่เป็น reusable form system เต็มรูปแบบ

### 3. รายการคำขอมีภาระงานหลายอย่างใน component เดียว

- `components/PowerOutageRequestList.tsx` รับผิดชอบ data load, selection, edit, delete, bulk update, responsive switch และ logging
- filter/search/pagination แยก component แล้ว แต่ orchestration ยังรวมศูนย์มากเกินไป

### 4. Admin area ยังพร้อมสำหรับแยกโมดูล แต่ยังไม่ถูกจัดเป็น domain ที่ชัด

- `app/admin/**` แยกโครงสร้างไว้พอสมควรแล้ว
- แต่ data/action layer ยังโยงกับไฟล์รวมขนาดใหญ่ เช่น `app/api/action/User.ts`
- ความรับผิดชอบเรื่อง users, transformers, export และ CSV ยังมี coupling สูง

### 5. Naming, file hygiene และ technical debt ยังมีให้เก็บหลายจุด

- มีไฟล์ชื่อผิด/สะกดผิด เช่น `components/UpdateRequesr.tsx`, `components/Dashbord/*`
- มีไฟล์ซ้ำหรือเสี่ยงต่อความสับสน เช่น `components/ui/tabs 2.tsx`
- ยังมี `any`, `console.error`, และ side effects กระจายหลายจุด
- dev tooling ถูก mount ใน root layout โดยยังไม่เห็น guard ที่ชัดสำหรับ production

---

## Refactor Goals

### Product Goals

- ผู้ใช้ทำงานหลักได้เร็วขึ้น โดยเฉพาะ flow สร้างคำขอ, ค้นหา, แก้ไข, bulk action
- ลด cognitive load ของหน้าที่มีข้อมูลเยอะ
- ทำให้แต่ละ role เห็นเฉพาะสิ่งที่ควรเห็น และ action ที่ควรทำ

### Engineering Goals

- ใช้ UI system หลักชุดเดียวให้ชัด
- แยก feature folder ตาม domain มากขึ้น
- ลด component ขนาดใหญ่และแยก orchestration ออกจาก presentational layer
- ลด `any` และย้าย business rule ไปอยู่ใน service/schema/hook ที่ตรงความรับผิดชอบ
- เตรียมโครงสร้างสำหรับให้หลาย agent ทำงานขนานกันได้

### Definition of Done

- ทุก flow หลักผ่าน smoke test
- ไม่มีไฟล์ซ้ำ/ชื่อผิดที่ยังใช้งานอยู่
- มี shared UI primitives และ page patterns ที่ชัด
- ขอบเขต state ของแต่ละ feature อ่านง่ายและ predictable
- มีเอกสารประกอบการดูแลต่อหลังจบ refactor

---

## Recommended Delivery States

## State 0: Discovery And Freeze
Status: `DONE`

### Objectives

- สรุปปัญหาเชิง UX, architecture และ delivery risk
- กำหนดเป้าหมายและลำดับงานก่อนเริ่มแก้จริง

### Checklist

- [x] ตรวจไฟล์หลักของ page flow
- [x] ตรวจรูปแบบการใช้ UI libraries
- [x] ตรวจ state management patterns
- [x] ระบุ hotspot files สำหรับงานแยก agent
- [x] สร้าง master plan และ checklist กลาง

### Exit Criteria

- มีเอกสาร roadmap กลาง
- รู้ว่า phase ไหนทำก่อนหลัง
- รู้ว่า agent ไหนรับผิดชอบ folder ไหน

---

## State 1: UI Foundation And Shared Shell
Status: `READY`

### Objectives

- กำหนด design system และ interaction baseline กลาง
- ลดความกระจัดกระจายของ layout, spacing, typography, icons และ feedback states

### Scope

- `app/layout.tsx`
- `app/globals.css`
- `components/Providers.tsx`
- `components/Navbar.tsx`
- `components/modals/ErrorModal.tsx`
- `components/ui/**`
- `components/forms/**`

### Checklist

- [ ] ตัดสินใจ primary UI system ให้ชัด ว่าจะยึด `Mantine + Tailwind` หรือ `Tailwind + custom primitives`
- [ ] กำหนด design tokens กลาง เช่น color, spacing, radius, shadow, z-index, status colors
- [ ] รวม icon strategy ให้เหลือชุดหลักชุดเดียว
- [ ] สร้าง shared feedback patterns สำหรับ loading, empty, error, success, confirm
- [ ] ย้าย `window.confirm` ไปใช้ confirm dialog มาตรฐาน
- [ ] ปรับ `RootLayout` ให้แยก concern ของ navbar, footer, dev tools ชัดขึ้น
- [ ] กำหนด page container pattern กลางสำหรับหน้า list, form, admin
- [ ] รวม form primitives ให้เหลือแนวทางเดียว

### Exit Criteria

- ทุกหน้ามี visual baseline เดียวกัน
- shared components พร้อมใช้ซ้ำ
- component ใหม่ไม่ต้องเลือกจากหลาย UI libraries แบบ ad hoc

---

## State 2: Request Creation Flow Refactor
Status: `READY`

### Objectives

- ทำให้ flow สร้างคำขออ่านง่าย, แก้ง่าย, ใช้งานเร็วขึ้น
- แยก form sections, validation, list staging และ submit orchestration ออกจากกัน

### Scope

- `app/power-outage-requests/create/**`
- `stores/powerOutageFormStore.ts`
- `hooks/usePowerOutageForm.ts`
- `lib/validations/powerOutageRequest.ts`

### Checklist

- [ ] แยก container component ออกจาก presentational form sections
- [ ] แยก date/time rules ออกจาก UI component
- [ ] ลดการส่ง props จำนวนมากใน `ImprovedFormFields.tsx`
- [ ] สร้าง reusable section components เช่น date-time, location, transformer, request staging
- [ ] ปรับ validation/error copy ให้ผู้ใช้เข้าใจเร็วขึ้น
- [ ] ทำ flow import CSV ให้เห็นสถานะชัด: upload, parse, validate, resolve, import result
- [ ] ทำ autosave/temporary draft strategy ถ้าจำเป็น
- [ ] ลด dependency ระหว่าง RHF state กับ Zustand ให้ role ชัดเจน
- [ ] ทบทวนว่าจะเก็บ staged requests ใน store หรือ local feature state

### Exit Criteria

- หน้า create แยก concern ชัด
- ฟอร์มอ่านและ maintain ได้ง่ายขึ้น
- ผู้ใช้เข้าใจสถานะของข้อมูลและ validation ได้ทันที

---

## State 3: Request List, Search, Edit And Bulk Actions
Status: `READY`

### Objectives

- ทำให้หน้ารายการคำขอรองรับงานจริงได้ดีขึ้น โดยเฉพาะ search/filter/edit/bulk action
- ลดภาระของ component ใหญ่และทำให้ behavior ทดสอบได้ง่ายขึ้น

### Scope

- `components/PowerOutageRequestList.tsx`
- `components/PowerOutageRequest/**`
- `hooks/usePowerOutageRequests.ts`
- `app/power-outage-requests/page.tsx`
- `components/UpdateRequesr.tsx`

### Checklist

- [ ] แยก list container ออกจาก table/card presentation
- [ ] ย้าย selection logic, bulk action logic, edit modal logic ไปเป็น sub-hooks หรือ feature controllers
- [ ] ออกแบบ filter model กลางให้ใช้ซ้ำได้
- [ ] ทบทวน default filters ให้สอดคล้องงานจริงของผู้ใช้
- [ ] รวม mobile/desktop rendering strategy ให้ชัดกว่าการเช็ก `window.innerWidth` ตรง ๆ
- [ ] สร้าง empty state และ no-result state ที่ชัด
- [ ] ปรับ action buttons ให้ขึ้นกับ role และ status แบบอ่านง่าย
- [ ] เปลี่ยน modal edit ให้ใช้ shared dialog/form pattern
- [ ] แก้ naming file `UpdateRequesr.tsx` และ import ที่เกี่ยวข้อง

### Exit Criteria

- list flow แยกเป็นโมดูลย่อยชัด
- bulk action และ edit flow ทดสอบแยกได้
- UX ของ table/card/filter มีความคงเส้นคงวามากขึ้น

---

## State 4: Admin Domain Refactor
Status: `READY`

### Objectives

- แยก admin ให้เป็น domain ชัดเจนและลด coupling กับ action layer ขนาดใหญ่
- เตรียมความพร้อมสำหรับการเพิ่ม feature ในอนาคต

### Scope

- `app/admin/**`
- `app/admin/components/**`
- `app/admin/hooks/**`
- `app/admin/context/**`
- `app/admin/utils/**`
- ส่วนที่เกี่ยวข้องใน `app/api/action/User.ts`

### Checklist

- [ ] แยก domain ย่อย `users`, `transformers`, `export` ให้ชัดทั้ง UI และ data layer
- [ ] สร้าง pattern กลางสำหรับ table toolbar, pagination, search bar, empty/error state
- [ ] ลดการอิงไฟล์ action รวม โดยแยก service/action ตาม domain
- [ ] ปรับ tab navigation และ page header ให้สื่อ context ของงานแต่ละแท็บชัดขึ้น
- [ ] แยก CSV import pipeline ออกจาก UI concerns
- [ ] เพิ่ม confirm/error/success flows มาตรฐานให้ส่วน admin
- [ ] ทำ role/permission review สำหรับ admin actions ที่มีผลกระทบสูง

### Exit Criteria

- แต่ละ admin module มี owner ชัด
- ขยาย feature ใหม่ได้โดยไม่แตะทุกส่วน
- data operation มีขอบเขตชัดกว่าปัจจุบัน

---

## State 5: Data, State And Server Boundaries
Status: `READY`

### Objectives

- ทำให้ data flow, typing และ service boundaries ชัดขึ้น
- ลดความเสี่ยงจาก `any`, side effects และ business logic ที่กระจายหลายชั้น

### Scope

- `app/api/action/*.ts`
- `lib/services/**`
- `lib/validations/**`
- `hooks/queries/**`
- `hooks/**`
- `lib/utils/**`

### Checklist

- [ ] แยก server actions ขนาดใหญ่ตาม domain
- [ ] ทบทวน naming และ responsibility ของ service layer
- [ ] ลดการใช้ `any` ใน API responses, form state และ logger details
- [ ] สร้าง shared types สำหรับ request list, admin tables และ form payloads
- [ ] ย้าย formatting/mapper logic ไปยัง utility หรือ selector ที่เหมาะสม
- [ ] ทบทวนว่า logic ไหนควรอยู่ใน React Query hook, service, server action หรือ component
- [ ] ลด `console.error` และสร้าง error handling strategy ที่สม่ำเสมอ
- [ ] ตรวจ dev/prod guards ของ logging และ debug tools

### Exit Criteria

- data layer อ่านง่ายและ predictable
- type coverage ดีขึ้นอย่างเห็นได้ชัด
- business logic ไม่กระจายมั่วระหว่าง UI กับ server

---

## State 6: Hardening, QA And Rollout
Status: `READY`

### Objectives

- ทำให้ refactor ปล่อยใช้งานได้อย่างปลอดภัย
- ลด regression จากการแก้หลายส่วนพร้อมกัน

### Scope

- ทั้งโปรเจค

### Checklist

- [ ] เพิ่ม smoke checklist สำหรับทุก role
- [ ] ตรวจ responsive behavior ของ flow หลัก
- [ ] ตรวจ accessibility เบื้องต้นของ form, dialog, table actions
- [ ] ตรวจ loading/error states ในทุกหน้า
- [ ] เก็บ dead files, duplicate files, และ import ที่ไม่ใช้แล้ว
- [ ] อัปเดต README หรือ docs ที่จำเป็น
- [ ] ทำ rollout note และ known issues list

### Exit Criteria

- พร้อม merge/release แบบควบคุมความเสี่ยงได้
- ทีมอื่นเข้ามารับงานต่อได้จาก docs

---

## Suggested Agent Split

หลักการแบ่ง agent:

- ให้แต่ละ agent ถือ write scope ที่ชัดที่สุด
- ลดการแก้ไฟล์ shared พร้อมกันโดยไม่จำเป็น
- เรียงงานตาม dependency เพื่อให้ merge ง่าย

### Agent A: Design System And Shared UI Foundation

### Ownership

- `app/layout.tsx`
- `app/globals.css`
- `components/Providers.tsx`
- `components/Navbar.tsx`
- `components/modals/ErrorModal.tsx`
- `components/ui/**`
- `components/forms/**`

### Responsibilities

- วาง shared shell
- รวม feedback patterns
- สร้าง/ปรับ shared primitives
- ตัดสินใจเรื่อง icon system และ UI baseline

### Dependency

- ควรเริ่มก่อน Agent B/C/D หรือทำคู่กันได้ถ้าไม่แก้ API

---

### Agent B: Request Create Flow

### Ownership

- `app/power-outage-requests/create/**`
- `stores/powerOutageFormStore.ts`
- `hooks/usePowerOutageForm.ts`
- `lib/validations/powerOutageRequest.ts`

### Responsibilities

- แยก form architecture
- ปรับ UX ของ create flow
- ทำ section/componentization
- เก็บ staged request behavior และ CSV import UX

### Dependency

- ควรรอ foundation หลักจาก Agent A ในส่วน shared form primitives ถ้ามีการเปลี่ยนหนัก

---

### Agent C: Request List And Bulk Operations

### Ownership

- `components/PowerOutageRequestList.tsx`
- `components/PowerOutageRequest/**`
- `components/UpdateRequesr.tsx`
- `hooks/usePowerOutageRequests.ts`
- `app/power-outage-requests/page.tsx`

### Responsibilities

- แยก container/presentation
- ปรับ list UX
- ปรับ filter/search/pagination model
- ปรับ bulk action และ edit flow

### Dependency

- ทำขนานกับ Agent B ได้
- ควร sync กับ Agent A เรื่อง shared dialog, table, button patterns

---

### Agent D: Admin Domain

### Ownership

- `app/admin/**`
- ส่วน admin-related services/actions ที่เกี่ยวข้อง

### Responsibilities

- refactor users/transformers/export เป็น domain modules
- ปรับ layout/pattern ของ admin tables
- ลด coupling ระหว่าง UI และ action layer

### Dependency

- ทำขนานกับ Agent B/C ได้ถ้าไม่แตะ shared primitives พร้อมกันมากเกินไป

---

### Agent E: Data And Platform Cleanup

### Ownership

- `app/api/action/*.ts`
- `lib/services/**`
- `lib/utils/**`
- `hooks/queries/**`
- shared type definitions

### Responsibilities

- แยก server actions
- ลด `any`
- ปรับ service boundaries
- ทำ error/logging strategy

### Dependency

- ควรทำเป็นคู่กับทุก agent แต่ต้องคุม ownership ชัด
- ไม่ควรรีไรต์ data contracts พร้อมกันหลายส่วนโดยไม่มี migration plan

---

## Recommended Execution Order

1. State 1 โดย Agent A
2. State 2 และ State 3 โดย Agent B + Agent C
3. State 4 โดย Agent D
4. State 5 โดย Agent E ร่วมกับการปิดงานของแต่ละ state
5. State 6 เป็น cross-team hardening

---

## Merge Strategy

- ใช้ branch แยกตาม state หรือ agent scope
- หลีกเลี่ยงการแก้ `app/layout.tsx`, shared forms และ shared UI primitives พร้อมกันหลาย branch
- ถ้ามีการ rename file ให้ทำเร็วในช่วงต้น เช่น `UpdateRequesr.tsx`
- ถ้ามีการเปลี่ยน shared type ให้ประกาศ contract ก่อน merge

---

## Tracking Template

ใช้ checklist ด้านล่างอัปเดตสถานะจริงระหว่างทำงาน:

### In Progress Board

- [ ] Agent A started
- [ ] Agent B started
- [ ] Agent C started
- [ ] Agent D started
- [ ] Agent E started
- [ ] State 1 completed
- [ ] State 2 completed
- [ ] State 3 completed
- [ ] State 4 completed
- [ ] State 5 completed
- [ ] State 6 completed

### Blockers

- [ ] ตัดสินใจ primary UI system แล้ว
- [ ] ตกลง shared dialog/form/table pattern แล้ว
- [ ] ตกลง data contract สำหรับ request list และ admin tables แล้ว
- [ ] ตกลง rollout strategy สำหรับ release ใหญ่แล้ว

---

## Immediate Next Step

แนะนำให้เริ่มจาก State 1 ก่อน แล้วค่อยแตกงานย่อยดังนี้:

1. ตัดสินใจ UI system หลัก
2. สร้าง shared page shell และ feedback components
3. ค่อย refactor หน้า `create` และ `list` ให้ใช้ pattern เดียวกัน
4. ปิดท้ายด้วย admin และ data layer cleanup

ถ้าจะลงมือทันที รอบแรกควรโฟกัสไฟล์ชุดนี้ก่อน:

- `app/layout.tsx`
- `app/globals.css`
- `components/Providers.tsx`
- `components/Navbar.tsx`
- `components/forms/**`
- `components/modals/ErrorModal.tsx`
