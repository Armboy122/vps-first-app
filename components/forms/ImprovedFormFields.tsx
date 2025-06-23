"use client";
import React from "react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  Controller,
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
  Divider,
  Grid,
  Badge,
  Alert,
  Autocomplete,
  Loader
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";

interface WorkCenter {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  shortName: string;
  workCenterId: number;
}

interface Transformer {
  transformerNumber: string;
  gisDetails: string;
}

interface ImprovedFormFieldsProps {
  register: UseFormRegister<PowerOutageRequestInput>;
  control: Control<PowerOutageRequestInput>;
  errors: FieldErrors<PowerOutageRequestInput>;
  role: string;
  workCenters?: WorkCenter[];
  branches: Branch[];
  transformers: Transformer[];
  watchWorkCenterId: string;
  minSelectableDate: string;
  watchedOutageDate: string;
  daysFromToday: number | null;
  timeError: string | null;
  branchesLoading?: boolean;
  watchedStartTime?: string;
  watchedEndTime?: string;
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
  branches,
  transformers,
  watchWorkCenterId,
  minSelectableDate,
  watchedOutageDate,
  daysFromToday,
  timeError,
  branchesLoading,
  watchedStartTime,
  watchedEndTime,
  onDateChange,
  onTransformerSearch,
  onTransformerSelect,
}) => {
  
  // ฟังก์ชันแยก transformerNumber จาก label
  const extractTransformerNumber = (value: string): string => {
    if (!value) return "";
    
    // ถ้ามี " - " ให้แยกเอาส่วนแรก
    if (value.includes(' - ')) {
      return value.split(' - ')[0];
    }
    
    // ถ้าไม่มี ให้ใช้ค่าตรงๆ
    return value;
  };
  
  // ฟังก์ชันตรวจสอบว่าเป็น transformerNumber ที่ถูกต้องหรือไม่
  const isValidTransformerNumber = (value: string): boolean => {
    return transformers.some(t => t.transformerNumber === value);
  };
  const workCenterOptions =
    workCenters?.map((wc) => ({ value: wc.id.toString(), label: wc.name })) || [];
  const branchOptions = branches.map((branch) => ({
    value: branch.id.toString(),
    label: branch.shortName,
  }));

  // สร้าง autocomplete data สำหรับ transformer
  const transformerData = transformers.map(t => ({
    value: t.transformerNumber,
    label: `${t.transformerNumber} - ${t.gisDetails}`
  }));

  // ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย (พศ.)
  const formatThaiDate = (date: string) => {
    return dayjs(date).add(543, 'year').format("DD/MM/YYYY");
  };

  return (
    <Stack gap="xl">
      {/* ส่วนที่ 1: ข้อมูลวันที่และเวลา */}
      <Paper shadow="xs" p="md" radius="md">
        <Group mb="md">
          <div>
            <Title order={4} c="blue">📅 กำหนดวันที่และเวลา</Title>
            <Text size="sm" c="dimmed">ระบุวันที่และช่วงเวลาที่ต้องการดับไฟ</Text>
          </div>
          {daysFromToday !== null && (
            <Badge
              color={daysFromToday > 10 ? "green" : "red"}
              size="lg"
              variant="light"
            >
              {daysFromToday > 10 ? `✅ ${daysFromToday} วัน` : `❌ ${daysFromToday} วัน`}
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
                      if (date) {
                        const dateString = dayjs(date).format("YYYY-MM-DD");
                        field.onChange(dateString);
                        // Trigger onDateChange for validation
                        onDateChange({ target: { value: dateString } } as any);
                      }
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
              minTime={(() => {
                if (!watchedStartTime) return "06:30";
                // คำนวณเวลาขั้นต่ำ (เวลาเริ่มต้น + 30 นาที)
                const [hour, min] = watchedStartTime.split(':').map(Number);
                const totalMinutes = hour * 60 + min + 30;
                const newHour = Math.floor(totalMinutes / 60);
                const newMin = totalMinutes % 60;
                return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
              })()}
              maxTime="20:00"
            />
            {watchedStartTime && watchedEndTime && (() => {
              // แปลงเวลาเป็นนาทีเพื่อเปรียบเทียบ
              const [startHour, startMin] = watchedStartTime.split(':').map(Number);
              const [endHour, endMin] = watchedEndTime.split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;
              return endMinutes <= startMinutes + 29; // ต้องมากกว่า 30 นาที
            })() && (
              <Alert color="red" mt={4}>
                ⚠️ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้นอย่างน้อย 30 นาที
              </Alert>
            )}
          </Grid.Col>
        </Grid>
      </Paper>

      {/* ส่วนที่ 2: ข้อมูลสถานที่ */}
      <Paper shadow="xs" p="md" radius="md">
        <Group mb="md">
          <div>
            <Title order={4} c="orange">🏢 ข้อมูลสถานที่</Title>
            <Text size="sm" c="dimmed">ระบุสถานที่ที่ต้องการดับไฟ</Text>
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
                    const transformer = transformers.find(t => t.transformerNumber === field.value);
                    if (transformer) {
                      return `${transformer.transformerNumber} - ${transformer.gisDetails}`;
                    }
                    return field.value || "";
                  })()}
                  onChange={(value) => {
                    // แยก transformerNumber จาก label
                    const transformerNumber = extractTransformerNumber(value);
                    
                    // ตั้งค่า transformerNumber ใน form
                    field.onChange(transformerNumber);
                    
                    // ใช้ค่าเต็มสำหรับการค้นหา
                    onTransformerSearch(value);
                  }}
                  onOptionSubmit={(value) => {
                    // แยก transformerNumber จาก value
                    const transformerNumber = extractTransformerNumber(value);
                    
                    // หา transformer โดยใช้ transformerNumber
                    const transformer = transformers.find(t => t.transformerNumber === transformerNumber);
                    if (transformer) {
                      // ตั้งค่า transformerNumber ที่ถูกต้องใน form
                      field.onChange(transformer.transformerNumber);
                      onTransformerSelect(transformer);
                    } else {
                      // ถ้าไม่เจอ ให้ใช้ transformerNumber ที่แยกได้
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
      <Paper shadow="xs" p="md" radius="md">
        <Group mb="md">
          <div>
            <Title order={4} c="green">📍 รายละเอียดเพิ่มเติม</Title>
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
              placeholder="ระบุพื้นที่หรือชุมชนที่ได้รับผลกระทব"
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
        <Alert color="red" title="ข้อผิดพลาดเวลา">
          {timeError}
        </Alert>
      )}
    </Stack>
  );
};