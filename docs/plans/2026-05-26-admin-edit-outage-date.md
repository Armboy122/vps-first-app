# Admin Edit Outage Date Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** ให้ผู้ใช้ role `ADMIN` แก้ไข `outageDate` ของคำขอดับไฟเดิมได้จากหน้ารายการคำขอ โดยบันทึกวันที่ใหม่ลงฐานข้อมูลอย่างถูกต้องและมี permission guard ฝั่ง server

**Architecture:** ใช้ field เดิม `PowerOutageRequest.outageDate` ใน Prisma ไม่ต้อง migration เพิ่มคอลัมน์ แก้ update flow ให้รองรับ `outageDate` เฉพาะ ADMIN และยังคงให้ user เดิมแก้เวลา/พื้นที่ตามเงื่อนไขเดิมได้ถ้าระบบต้องการ บังคับ permission ใน server action ไม่เชื่อเฉพาะ UI

**Tech Stack:** Next.js 14 App Router, Server Actions, Prisma, React Hook Form, Zod, TypeScript assertion-style tests

---

## Current State ที่ตรวจพบ

- DB มี field วันที่อยู่แล้ว: `prisma/schema.prisma:113` -> `outageDate DateTime`
- Service update ยังไม่รับวันที่: `lib/services/powerOutageRequest.service.ts:204-207` รับเฉพาะ `startTime | endTime | area`
- Server action parse `outageDate` แล้วแต่ไม่ส่งไป update: `app/api/action/powerOutageRequest.ts:185-210`
- Modal update ไม่มีช่องวันที่: `components/UpdateRequest.tsx:52-73` มีเฉพาะเวลาเริ่ม/เวลาจบ/พื้นที่
- หน้า list ส่ง `initialData.outageDate` ให้ modal แล้ว: `components/PowerOutageRequestList.tsx:720-729`
- ปุ่ม edit ตอนนี้ admin เห็นอยู่แล้ว: `components/PowerOutageRequest/ActionButtons.tsx:43-45`
- ช่อง validate วันที่ตอนสร้างคำขอมี business rule: `lib/validations/powerOutageRequest.ts:142-184`
- มี test แบบ assertion script อยู่แล้ว: `lib/validations/powerOutageRequest.creation-rules.test.ts`

---

## Decision

- ไม่ทำ migration เพราะ `outageDate` มีใน schema แล้ว
- ให้ `ADMIN` เท่านั้นแก้วันที่ได้
- เมื่อแก้วันที่ ต้องคำนวณ `startTime` และ `endTime` ใหม่จากวันที่ใหม่ด้วย `createThailandDateTime(outageDate, time)` เพื่อไม่ให้เวลาไปติดวันที่เก่า
- ฝั่ง server ต้อง guard role ก่อน update เพราะ UI guard อย่างเดียวไม่ปลอดภัย
- วันที่ใหม่ควรผ่าน business calendar rule เดียวกับการสร้างคำขอ เว้นแต่ท่านต้องการ override ฉุกเฉินในอนาคต

---

## Task 1: เพิ่ม type/validation สำหรับ update payload

**Objective:** แยก schema update ให้ชัดว่า update ต้องมี `outageDate`, `startTime`, `endTime`, `area` และยัง validate time range เหมือน create

**Files:**
- Modify: `lib/validations/powerOutageRequest.ts`
- Test: `lib/validations/powerOutageRequest.update-rules.test.ts`

**Steps:**
1. สร้าง failing test ว่า `PowerOutageRequestUpdateSchema` reject เวลาจบก่อนเวลาเริ่ม และ accept payload update ที่มีวันที่
2. Run expected fail เพราะ schema ปัจจุบันไม่มี refine time rule
3. ปรับ `PowerOutageRequestUpdateSchema` ให้ reuse refine rule หรือ extract helper จาก `PowerOutageRequestSchema`
4. Run test ให้ pass

**Verification:**
- `npx tsc --noEmit`
- ถ้าต้องรัน assertion script ให้ใช้แนวทางเดียวกับ test เดิม หรือเพิ่ม npm script ภายหลัง

---

## Task 2: แก้ service ให้ update outageDate ได้

**Objective:** ให้ data layer บันทึกวันที่ใหม่ได้จริง

**Files:**
- Modify: `lib/services/powerOutageRequest.service.ts:204-211`

**Implementation direction:**
เปลี่ยน type จาก:

```ts
data: Partial<Pick<PowerOutageRequest, "startTime" | "endTime" | "area">>,
```

เป็น:

```ts
data: Partial<Pick<PowerOutageRequest, "outageDate" | "startTime" | "endTime" | "area">>,
```

**Test:**
- ถ้า mock Prisma ง่าย ให้เพิ่ม test assertion ว่า service ส่ง `outageDate` เข้า `prisma.powerOutageRequest.update({ data })`
- ถ้าไม่มี test harness ให้ครอบด้วย server action test ใน Task 3 และ `tsc`

---

## Task 3: แก้ server action update ให้บันทึกวันที่ + enforce admin permission

**Objective:** ฝั่ง server ต้องเป็นแหล่งตัดสินสิทธิ์จริง และส่ง `outageDate` ไป update

**Files:**
- Modify: `app/api/action/powerOutageRequest.ts:180-235`

**Required behavior:**
- `updatePowerOutageRequest(id, data)` ต้องเรียก `getCurrentUser()` ก่อน update
- ดึง request เดิมด้วย `PowerOutageRequestService.getRequestById(id)`
- ถ้าไม่พบ -> return `{ success: false, error: "ไม่พบคำขอดับไฟ" }`
- ถ้า `currentUser.role !== "ADMIN"` และมีการเปลี่ยน `outageDate` -> return forbidden
- ถ้า admin เปลี่ยนวันที่ -> validate ด้วย `PowerOutageRequestService.validateOutageDateWithCalendar(outageDate)`
- update data ต้องมี `outageDate, startTime, endTime, area`

**Important code shape:**

```ts
const currentUser = await getCurrentUser();
const existingRequest = await PowerOutageRequestService.getRequestById(id);
if (!existingRequest) return { success: false, error: "ไม่พบคำขอดับไฟ" };

const validatedData = PowerOutageRequestUpdateSchema.pick({
  outageDate: true,
  startTime: true,
  endTime: true,
  area: true,
}).parse(data);

const outageDate = new Date(validatedData.outageDate);
const existingDateKey = existingRequest.outageDate.toISOString().split("T")[0];
const isChangingOutageDate = validatedData.outageDate !== existingDateKey;

if (isChangingOutageDate && currentUser.role !== "ADMIN") {
  return { success: false, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขวันที่ดับไฟได้" };
}

if (isChangingOutageDate) {
  const validation = await PowerOutageRequestService.validateOutageDateWithCalendar(outageDate);
  if (!validation.isValid) return { success: false, error: validation.error };
}

const startTime = createThailandDateTime(validatedData.outageDate, validatedData.startTime);
const endTime = createThailandDateTime(validatedData.outageDate, validatedData.endTime);

const updatedRequest = await PowerOutageRequestService.updateRequest(id, {
  outageDate,
  startTime,
  endTime,
  area: validatedData.area,
});
```

**Note:** ระวัง timezone ตอนเทียบ date key ถ้าข้อมูลเป็น Thailand date ควรใช้ helper format date แบบ local/Thailand ไม่ใช้ UTC ล้วนถ้าเจอ off-by-one

---

## Task 4: เพิ่มช่องวันที่ใน modal และล็อกเฉพาะ admin

**Objective:** Admin สามารถเลือกวันที่ใน modal ได้ ส่วน role อื่นเห็นวันที่เดิมแบบ disabled หรือไม่แสดงช่องแก้

**Files:**
- Modify: `components/UpdateRequest.tsx`
- Modify: `components/PowerOutageRequestList.tsx:719-733`

**Implementation direction:**
- เพิ่ม prop `canEditOutageDate: boolean`
- ใน `PowerOutageRequestList` ส่ง `canEditOutageDate={isAdmin}`
- เพิ่ม input วันที่ใน modal:

```tsx
<TextField
  {...register("outageDate")}
  label="วันที่ดับไฟ"
  type="date"
  variant="outlined"
  fullWidth
  disabled={!canEditOutageDate}
  error={!!errors.outageDate}
  helperText={
    canEditOutageDate
      ? errors.outageDate?.message
      : "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขวันที่ดับไฟได้"
  }
  InputLabelProps={{ shrink: true }}
/>
```

**UX acceptance:**
- Admin เปิด modal แล้วเห็นช่อง “วันที่ดับไฟ” แก้ได้
- User เปิด modal แล้วช่องวันที่แก้ไม่ได้ หรือไม่แสดง แต่ยังแก้เวลา/พื้นที่ได้ตามสิทธิ์เดิม
- Submit แล้ว modal ปิดและ list reload เห็นวันที่ใหม่

---

## Task 5: ปรับ permission UI ให้ตรง server มากขึ้น

**Objective:** ลดความสับสนเรื่องใครแก้อะไรได้ แต่ไม่ใช้ UI เป็น security boundary

**Files:**
- Modify: `components/PowerOutageRequest/ActionButtons.tsx`
- Modify: `components/PowerOutageRequest/MobileCard.tsx`
- Optional: `components/PowerOutageRequest/TableRow.tsx`

**Direction:**
- Desktop: ปุ่มแก้ไขยังแสดงสำหรับ admin และ user ที่มีสิทธิ์ตามเดิม
- Modal จะเป็นตัวล็อก field วันที่ตาม `isAdmin`
- Mobile: `canEdit` ควรคง admin และ user workCenter เดิม แต่ field วันที่ล็อกใน modal

---

## Task 6: เพิ่ม audit/log message สำหรับการเปลี่ยนวันที่

**Objective:** ให้ log บอกชัดเมื่อเปลี่ยนวันดับไฟ เพราะเป็นข้อมูลสำคัญ

**Files:**
- Modify: `components/PowerOutageRequestList.tsx:262-274`
- Optional server-side log in `app/api/action/powerOutageRequest.ts`

**Direction:**
- Log old/new outageDate ตอน `power_outage_request_update_started` และ `power_outage_request_updated`
- ไม่ใส่ข้อมูลส่วนตัวเกินจำเป็น

---

## Task 7: Verification

**Commands:**

```bash
cd /Users/sakdithat/vps-first-app
npx tsc --noEmit
npm run build
```

**Manual browser test:**
1. Login เป็น ADMIN
2. ไป `/power-outage-requests`
3. กดแก้ไขรายการหนึ่ง
4. เปลี่ยน `วันที่ดับไฟ` + เวลา
5. บันทึก ต้องเห็นวันที่ใหม่ในตารางและ urgency color/sort เปลี่ยนตามวันที่ใหม่
6. Login เป็น USER
7. เปิด modal รายการที่แก้ได้ ต้องแก้วันที่ไม่ได้
8. ลองยิง server action/submit payload เปลี่ยนวันที่จาก USER ต้องโดน error `เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขวันที่ดับไฟได้`

---

## Acceptance Criteria

- ADMIN แก้วันที่ดับไฟของคำขอเดิมได้
- วันที่ใหม่ถูกบันทึกใน `PowerOutageRequest.outageDate`
- `startTime/endTime` ถูกผูกกับวันที่ใหม่ ไม่ค้างวันที่เก่า
- USER/VIEWER/MANAGER/SUPERVISOR แก้วันที่ไม่ได้จาก server action
- Build ผ่าน และไม่มี TypeScript error
- ไม่ต้องแก้ Prisma schema/migration
