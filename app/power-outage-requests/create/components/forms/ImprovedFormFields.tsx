"use client";
import React from "react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  Controller,
  useWatch,
} from "react-hook-form";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import {
  FormInput,
  FormSelect,
} from "@/components/forms";
import { TimeChipPicker } from "./TimeChipPicker";
import {
  Paper,
  Group,
  Stack,
  Title,
  Text,
  Grid,
  Badge,
  Alert,
  Autocomplete,
  Loader
} from "@mantine/core";
import { CalendarDays, Building2, MapPin, Clock, ArrowRight } from "lucide-react";
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";
import {
  BusinessDayCalendarConfig,
  getBusinessDaysUntilOutage,
  getCalendarDaysUntilOutage,
  getMinOutageBusinessDateString,
  MIN_OUTAGE_BUSINESS_DAYS,
  MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE,
} from "@/lib/validations/powerOutageRequest";

// Hooks — data is fetched/derived here to reduce prop drilling
import { usePowerOutageFormStore } from "@/stores/powerOutageFormStore";
import { useBranches } from "@/hooks/queries/useBranches";

interface WorkCenter {
  id: number;
  name: string;
}

interface Transformer {
  transformerNumber: string;
  gisDetails: string;
}

/**
 * Props for ImprovedFormFields
 *
 * Deliberately lean — only props that cannot be derived inside this component:
 *   - register / control / errors: must come from the parent RHF instance
 *   - role: determines which fields are shown (admin vs regular user)
 *   - workCenters: list loaded server-side and passed down from the page
 *   - onDateChange: triggers parent-level date validation side-effect
 *   - onTransformerSearch: updates the search term held in the parent
 *   - onTransformerSelect: lets the parent react to a transformer being picked
 *
 * The following data that was previously prop-drilled is now fetched/derived
 * directly inside this component:
 *   - branches, branchesLoading  (useBranches query, keyed on watched workCenterId)
 *   - transformers               (useTransformers query, managed here)
 *   - timeError                  (read from Zustand store)
 *   - minSelectableDate          (derived from dateUtils)
 *   - watchedOutageDate, watchWorkCenterId, watchedStartTime, watchedEndTime
 *                                (useWatch on the provided control)
 *   - daysFromToday              (derived from watchedOutageDate)
 */
interface ImprovedFormFieldsProps {
  register: UseFormRegister<PowerOutageRequestInput>;
  control: Control<PowerOutageRequestInput>;
  errors: FieldErrors<PowerOutageRequestInput>;
  role: string;
  workCenters?: WorkCenter[];
  onDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTransformerSearch: (searchTerm: string) => void;
  onTransformerSelect: (transformer: Transformer) => void;
  currentStep?: number;
  onSetValue?: (name: keyof PowerOutageRequestInput, value: string) => void;
  holidayDateKeys?: string[];
  specialWorkdayDateKeys?: string[];
  minSelectableDate?: string;
  daysFromToday?: number | null;
  calendarDaysFromToday?: number | null;
}

export const ImprovedFormFields: React.FC<ImprovedFormFieldsProps> = ({
  register,
  control,
  errors,
  role,
  workCenters,
  onDateChange,
  onTransformerSearch,
  onTransformerSelect,
  currentStep = 1,
  onSetValue,
  holidayDateKeys = [],
  specialWorkdayDateKeys = [],
  minSelectableDate: providedMinSelectableDate,
  daysFromToday: providedDaysFromToday,
  calendarDaysFromToday: providedCalendarDaysFromToday,
}) => {
  // =========================================
  // Data derived / fetched inside the component
  // (previously passed as props — reduces prop drilling)
  // =========================================

  // Read cross-field time error from Zustand store (not a RHF field error)
  const { timeError } = usePowerOutageFormStore();

  // Watch RHF field values via the provided control
  const watchWorkCenterId = useWatch({ control, name: "workCenterId" });
  const watchedOutageDate = useWatch({ control, name: "outageDate" });
  const watchedStartTime = useWatch({ control, name: "startTime" });
  const watchedEndTime = useWatch({ control, name: "endTime" });

  // Fetch branches when workCenterId changes
  const { data: branches = [], isLoading: branchesLoading } = useBranches(
    watchWorkCenterId ? Number(watchWorkCenterId) : null,
  );

  // Fetch transformers based on search term managed inside parent via onTransformerSearch;
  // the transformers list itself comes from the Zustand store (set by parent via useTransformers)
  const { transformers } = usePowerOutageFormStore();

  // Calculated values
  const calendarConfig = React.useMemo<BusinessDayCalendarConfig>(
    () => ({ holidayDateKeys, specialWorkdayDateKeys }),
    [holidayDateKeys, specialWorkdayDateKeys],
  );
  const minSelectableDate =
    providedMinSelectableDate ||
    getMinOutageBusinessDateString(new Date(), calendarConfig);
  const daysFromToday =
    providedDaysFromToday ??
    getBusinessDaysUntilOutage(watchedOutageDate, new Date(), calendarConfig);
  const calendarDaysFromToday =
    providedCalendarDaysFromToday ??
    getCalendarDaysUntilOutage(watchedOutageDate, new Date());

  // =========================================
  // Helper functions
  // =========================================

  // แยก transformerNumber จาก label ("TX001 - หน้าโรงเรียน" → "TX001")
  const extractTransformerNumber = (value: string): string => {
    if (!value) return "";
    if (value.includes(' - ')) {
      return value.split(' - ')[0];
    }
    return value;
  };

  /**
   * Calculate the minimum allowed end-time string given the current start time.
   * Returns "06:30" as fallback when no start time is set.
   */
  const getMinEndTime = (startTime: string | undefined): string => {
    if (!startTime) return "06:30";
    const [hour, min] = startTime.split(':').map(Number);
    const totalMinutes = hour * 60 + min + 30;
    const newHour = Math.floor(totalMinutes / 60);
    const newMin = totalMinutes % 60;
    return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
  };

  /**
   * Check whether the gap between start and end is less than 30 minutes.
   */
  const isEndTimeTooClose = (startTime: string | undefined, endTime: string | undefined): boolean => {
    if (!startTime || !endTime) return false;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour * 60 + endMin) <= (startHour * 60 + startMin) + 29;
  };

  const workCenterOptions =
    workCenters?.map((wc) => ({ value: wc.id.toString(), label: wc.name })) || [];
  const branchOptions = branches.map((branch) => ({
    value: branch.id.toString(),
    label: branch.shortName,
  }));

  // สร้าง autocomplete data สำหรับ transformer
  const transformerData = transformers.map((t: Transformer) => ({
    value: t.transformerNumber,
    label: `${t.transformerNumber} - ${t.gisDetails}`
  }));

  // แปลงวันที่เป็นรูปแบบไทย (พศ.)
  const formatThaiDate = (date: string) => {
    return dayjs(date).add(543, 'year').format("DD/MM/YYYY");
  };

  // =========================================
  // Quick time presets
  // =========================================
  const TIME_PRESETS = [
    { label: "เช้า", sub: "08:00 – 12:00", start: "8:00", end: "12:00" },
    { label: "บ่าย", sub: "13:00 – 17:00", start: "13:00", end: "17:00" },
    { label: "เต็มวัน", sub: "08:00 – 17:00", start: "8:00", end: "17:00" },
    { label: "เช้าสั้น", sub: "08:00 – 10:00", start: "8:00", end: "10:00" },
  ];

  const applyTimePreset = (start: string, end: string) => {
    if (onSetValue) {
      onSetValue("startTime", start);
      onSetValue("endTime", end);
    }
  };

  // Calculate duration between start and end time
  const getDuration = (): string | null => {
    if (!watchedStartTime || !watchedEndTime) return null;
    const [sh, sm] = watchedStartTime.split(':').map(Number);
    const [eh, em] = watchedEndTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
    const diffMin = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMin <= 0) return null;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (hours > 0 && mins > 0) return `${hours} ชม. ${mins} น.`;
    if (hours > 0) return `${hours} ชม.`;
    return `${mins} น.`;
  };

  const duration = getDuration();

  // Check if a preset is currently active
  const isPresetActive = (start: string, end: string): boolean => {
    if (!watchedStartTime || !watchedEndTime) return false;
    // Normalize: "8:00" === "8:00", "08:00" === "8:00"
    const norm = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return `${h}:${String(m).padStart(2, '0')}`;
    };
    return norm(watchedStartTime) === norm(start) && norm(watchedEndTime) === norm(end);
  };

  return (
    <Stack gap="xl">
      {/* ====== STEP 1: วันที่และเวลา ====== */}
      {currentStep === 1 && (
      <Paper shadow="xs" p="lg" radius="md" withBorder>
        <Group mb="md" justify="space-between">
          <Group gap="sm">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 ring-1 ring-blue-200/60">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <Title order={4} c="dark" className="text-[17px]">กำหนดวันที่และเวลา</Title>
              <Text size="sm" c="gray.6">ระบุวันที่และช่วงเวลาที่ต้องการดับไฟ</Text>
            </div>
          </Group>
          <div className="flex items-center gap-2">
            {duration && (
              <Badge color="blue" size="lg" variant="light" radius="md">
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {duration}</span>
              </Badge>
            )}
            {daysFromToday !== null && (
              <Badge
                color={
                  daysFromToday >= MIN_OUTAGE_BUSINESS_DAYS &&
                  (calendarDaysFromToday ?? 0) > MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE
                    ? "green"
                    : "red"
                }
                size="lg"
                variant="light"
                radius="md"
              >
                {daysFromToday >= MIN_OUTAGE_BUSINESS_DAYS &&
                (calendarDaysFromToday ?? 0) > MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE
                  ? `ล่วงหน้า ${daysFromToday} วันทำการ / ${calendarDaysFromToday} วันปฏิทิน`
                  : `${daysFromToday} วันทำการ / ${calendarDaysFromToday ?? "-"} วันปฏิทิน (ไม่ถึงกำหนด)`}
              </Badge>
            )}
          </div>
        </Group>

        {/* วันที่ดับไฟ */}
        <div className="mb-5">
          <Controller
            name="outageDate"
            control={control}
            render={({ field }) => (
              <div>
                <DatePickerInput
                  label="วันที่ดับไฟ"
                  placeholder="กดเลือกวันที่"
                  value={field.value ? dayjs(field.value).toDate() : null}
                  onChange={(date) => {
                    const dateString = date
                      ? dayjs(date).format("YYYY-MM-DD")
                      : "";
                    field.onChange(dateString);
                    onDateChange({
                      target: { value: dateString },
                    } as React.ChangeEvent<HTMLInputElement>);
                  }}
                  valueFormat="DD/MM/YYYY"
                  minDate={dayjs(minSelectableDate).toDate()}
                  error={errors.outageDate?.message}
                  size="md"
                  withAsterisk
                  clearable
                  dropdownType="modal"
                  styles={{
                    input: {
                      fontSize: '16px',
                      cursor: 'pointer',
                    }
                  }}
                />
                {field.value && (
                  <Text size="sm" c="blue.7" mt={4}>
                    📅 วันที่เลือก: {formatThaiDate(field.value)}
                  </Text>
                )}
              </div>
            )}
          />
          <Text size="sm" c="gray.6" mt={4}>
            ต้องล่วงหน้าอย่างน้อย {MIN_OUTAGE_BUSINESS_DAYS} วันทำการ และมากกว่า {MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE} วันปฏิทิน — วันที่เร็วที่สุด: {formatThaiDate(minSelectableDate)}
          </Text>
        </div>

        {/* Quick Time Presets */}
        <div className="mb-4">
          <Text size="sm" fw={600} c="dark" mb={8}>เลือกช่วงเวลาด่วน</Text>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIME_PRESETS.map((preset) => {
              const active = isPresetActive(preset.start, preset.end);
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyTimePreset(preset.start, preset.end)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                    active
                      ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <span className={`block text-[15px] font-semibold ${active ? "text-blue-700" : "text-slate-800"}`}>
                    {preset.label}
                  </span>
                  <span className={`block text-sm ${active ? "text-blue-600" : "text-slate-500"}`}>
                    {preset.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* เวลาเริ่มต้น — เวลาสิ้นสุด */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-5">
          <Text size="sm" fw={600} c="dark">หรือกำหนดเวลาเอง</Text>
          <TimeChipPicker
            name="startTime"
            control={control}
            label="เวลาเริ่มต้น"
            required
            minTime="06:00"
            maxTime="19:30"
            error={errors.startTime}
          />
          <div className="border-t border-slate-200" />
          <TimeChipPicker
            name="endTime"
            control={control}
            label="เวลาสิ้นสุด"
            required
            minTime="06:30"
            maxTime="20:00"
            error={errors.endTime}
          />
          {isEndTimeTooClose(watchedStartTime, watchedEndTime) && (
            <Alert color="red" radius="md">
              เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที (ขั้นต่ำ: {getMinEndTime(watchedStartTime)} น.)
            </Alert>
          )}
        </div>
      </Paper>
      )}

      {/* ====== STEP 2: ข้อมูลสถานที่ ====== */}
      {currentStep === 2 && (
      <>
      <Paper shadow="xs" p="lg" radius="md" withBorder>
        <Group mb="md">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 ring-1 ring-amber-200/60">
            <Building2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <Title order={4} c="dark" className="text-[17px]">ข้อมูลสถานที่</Title>
            <Text size="sm" c="gray.6">ระบุจุดรวมงาน สาขา และหม้อแปลง</Text>
          </div>
        </Group>

        <Grid>
          {/* จุดรวมงาน (Admin only) */}
          {role === "ADMIN" && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="workCenterId"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-[15px] font-semibold text-slate-800 mb-1.5">
                      จุดรวมงาน *
                    </label>
                    <FormSelect
                      {...field}
                      options={workCenterOptions}
                      placeholder="เลือกจุดรวมงาน"
                      error={errors.workCenterId}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </div>
                )}
              />
              <Text size="sm" c="gray.6" mt={4}>
                เลือกจุดรวมงานก่อนเพื่อโหลดสาขา
              </Text>
            </Grid.Col>
          )}

          {/* สาขา (Admin only) */}
          {role === "ADMIN" && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-[15px] font-semibold text-slate-800 mb-1.5">
                      สาขา *
                    </label>
                    <FormSelect
                      {...field}
                      options={branchOptions}
                      placeholder={
                        !watchWorkCenterId
                          ? "กรุณาเลือกจุดรวมงานก่อน"
                          : branchesLoading
                            ? "กำลังโหลดสาขา..."
                            : "เลือกสาขา"
                      }
                      error={errors.branchId}
                      disabled={!watchWorkCenterId || branchesLoading}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    {branchesLoading && <Loader size="xs" />}
                  </div>
                )}
              />
            </Grid.Col>
          )}

          {/* หมายเลขหม้อแปลง */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Controller
              name="transformerNumber"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  label="หมายเลขหม้อแปลง"
                  placeholder="ค้นหาหมายเลขหม้อแปลง"
                  data={transformerData}
                  value={(() => {
                    // หา transformer เพื่อแสดง label ใน input
                    const transformer = transformers.find(
                      (t: Transformer) => t.transformerNumber === field.value
                    );
                    if (transformer) {
                      return `${transformer.transformerNumber} - ${transformer.gisDetails}`;
                    }
                    return field.value || "";
                  })()}
                  onChange={(value) => {
                    // แยก transformerNumber จาก label
                    const transformerNumber = extractTransformerNumber(value);
                    field.onChange(transformerNumber);
                    // ใช้ค่าเต็มสำหรับการค้นหา
                    onTransformerSearch(value);
                  }}
                  onOptionSubmit={(value) => {
                    // แยก transformerNumber จาก value
                    const transformerNumber = extractTransformerNumber(value);
                    // หา transformer โดยใช้ transformerNumber
                    const transformer = transformers.find(
                      (t: Transformer) => t.transformerNumber === transformerNumber
                    );
                    if (transformer) {
                      field.onChange(transformer.transformerNumber);
                      onTransformerSelect(transformer);
                    } else {
                      field.onChange(transformerNumber);
                    }
                  }}
                  error={errors.transformerNumber?.message}
                  withAsterisk
                  size="md"
                  maxDropdownHeight={200}
                  styles={{
                    input: {
                      fontSize: '16px',
                    }
                  }}
                />
              )}
            />
          </Grid.Col>

          {/* สถานที่ติดตั้ง (GIS) */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <div>
              <label className="block text-[15px] font-semibold text-slate-800 mb-1.5">
                สถานที่ติดตั้ง (GIS)
              </label>
              <FormInput
                {...register("gisDetails")}
                readOnly
                placeholder="จะถูกกรอกอัตโนมัติ"
                style={{
                  backgroundColor: '#f8f9fa',
                  color: '#6c757d'
                }}
              />
              <Text size="sm" c="gray.6" mt={4}>
                ข้อมูลนี้จะถูกกรอกอัตโนมัติเมื่อเลือกหม้อแปลง
              </Text>
            </div>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* พื้นที่ไฟดับ — ยังอยู่ใน step 2 */}
      <Paper shadow="xs" p="lg" radius="md" withBorder>
        <Group mb="md">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 ring-1 ring-emerald-200/60">
            <MapPin className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <Title order={4} c="dark" className="text-[17px]">รายละเอียดเพิ่มเติม</Title>
            <Text size="sm" c="gray.6">ข้อมูลเสริมสำหรับการดับไฟ</Text>
          </div>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12 }}>
            <div>
              <label className="block text-[15px] font-semibold text-slate-800 mb-1.5">
                พื้นที่ไฟดับ
              </label>
              <FormInput
              {...register("area")}
              placeholder="ระบุพื้นที่หรือชุมชนที่ได้รับผลกระทบ"
              error={errors.area}
            />
              <Text size="sm" c="gray.6" mt={4}>
                เช่น หมู่บ้านเจริญสุข, ตลาดสดเมือง, โรงพยาบาลส่วนภูมิภาค
              </Text>
            </div>
          </Grid.Col>
        </Grid>
      </Paper>
      </>
      )}

      {/* แสดง Time Error ถ้ามี */}
      {timeError && (
        <Alert color="red" title="ข้อผิดพลาดเวลา" radius="md" variant="light">
          {timeError}
        </Alert>
      )}
    </Stack>
  );
};
