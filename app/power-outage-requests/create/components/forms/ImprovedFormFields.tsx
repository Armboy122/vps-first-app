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
  FormField,
  FormInput,
  FormSelect,
} from "@/components/forms";
import { MantineTimePicker } from "./MantineTimePicker";
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
import { CalendarDays, Building2, MapPin } from "lucide-react";
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";

// Hooks — data is fetched/derived here to reduce prop drilling
import { usePowerOutageFormStore } from "@/stores/powerOutageFormStore";
import { useBranches } from "@/hooks/queries/useBranches";
import { useTransformers } from "@/hooks/queries/useTransformers";
import { getMinSelectableDate, getDaysFromToday } from "@/lib/utils/dateUtils";

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
  const minSelectableDate = getMinSelectableDate();
  const daysFromToday = getDaysFromToday(watchedOutageDate);

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

  return (
    <Stack gap="xl">
      {/* ส่วนที่ 1: ข้อมูลวันที่และเวลา */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Group mb="md" justify="space-between">
          <Group gap="sm">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 ring-1 ring-blue-200/60">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <Title order={4} c="dark">กำหนดวันที่และเวลา</Title>
              <Text size="sm" c="dimmed">ระบุวันที่และช่วงเวลาที่ต้องการดับไฟ</Text>
            </div>
          </Group>
          {daysFromToday !== null && (
            <Badge
              color={daysFromToday > 10 ? "green" : "red"}
              size="lg"
              variant="light"
              radius="md"
            >
              {daysFromToday > 10 ? `${daysFromToday} วัน` : `${daysFromToday} วัน (ไม่ถึงกำหนด)`}
            </Badge>
          )}
        </Group>

        <Grid>
          {/* วันที่ดับไฟ */}
          <Grid.Col span={{ base: 12, md: 4 }}>
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
                  {/* แสดงวันที่ที่เลือกในรูปแบบไทย */}
                  {field.value && (
                    <Text size="xs" c="blue" mt={2}>
                      📅 วันที่เลือก: {formatThaiDate(field.value)}
                    </Text>
                  )}
                </div>
              )}
            />
            <Text size="xs" c="dimmed" mt={4}>
              วันที่เร็วที่สุด: {formatThaiDate(minSelectableDate)}
            </Text>
          </Grid.Col>

          {/* เวลาเริ่มต้น */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <MantineTimePicker
              name="startTime"
              control={control}
              label="เวลาเริ่มต้น *"
              error={errors.startTime}
              minTime="06:00"
              maxTime="19:30"
            />
          </Grid.Col>

          {/* เวลาสิ้นสุด */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <MantineTimePicker
              name="endTime"
              control={control}
              label="เวลาสิ้นสุด *"
              error={errors.endTime}
              minTime={getMinEndTime(watchedStartTime)}
              maxTime="20:00"
            />
            {isEndTimeTooClose(watchedStartTime, watchedEndTime) && (
              <Alert color="red" mt={4}>
                เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้นอย่างน้อย 30 นาที (ขั้นต่ำ: {getMinEndTime(watchedStartTime)} น.)
              </Alert>
            )}
          </Grid.Col>
        </Grid>
      </Paper>

      {/* ส่วนที่ 2: ข้อมูลสถานที่ */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Group mb="md">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 ring-1 ring-amber-200/60">
            <Building2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <Title order={4} c="dark">ข้อมูลสถานที่</Title>
            <Text size="sm" c="dimmed">ระบุจุดรวมงาน สาขา และหม้อแปลง</Text>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <Text size="xs" c="dimmed" mt={4}>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <Text size="xs" c="dimmed" mt={4}>
                ข้อมูลนี้จะถูกกรอกอัตโนมัติเมื่อเลือกหม้อแปลง
              </Text>
            </div>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* ส่วนที่ 3: รายละเอียดเพิ่มเติม */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Group mb="md">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 ring-1 ring-emerald-200/60">
            <MapPin className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <Title order={4} c="dark">รายละเอียดเพิ่มเติม</Title>
            <Text size="sm" c="dimmed">ข้อมูลเสริมสำหรับการดับไฟ</Text>
          </div>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12 }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                พื้นที่ไฟดับ
              </label>
              <FormInput
              {...register("area")}
              placeholder="ระบุพื้นที่หรือชุมชนที่ได้รับผลกระทบ"
              error={errors.area}
            />
              <Text size="xs" c="dimmed" mt={4}>
                เช่น หมู่บ้านเจริญสุข, ตลาดสดเมือง, โรงพยาบาลส่วนภูมิภาค
              </Text>
            </div>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* แสดง Time Error ถ้ามี */}
      {timeError && (
        <Alert color="red" title="ข้อผิดพลาดเวลา" radius="md" variant="light">
          {timeError}
        </Alert>
      )}
    </Stack>
  );
};
