"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";
import {
  createPowerOutageRequest,
  createMultiplePowerOutageRequests,
  searchTransformers,
} from "@/app/api/action/powerOutageRequest";
import { useRouter } from "next/navigation";
import { getBranches } from "@/app/api/action/getWorkCentersAndBranches";
import { LocalizationProvider, MobileTimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
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

interface PowerOutageRequestFormProps {
  workCenters?: WorkCenter[];
  role: string;
  workCenterId?: string;
  branch?: string;
}

export default function PowerOutageRequestForm({
  workCenters,
  role,
  workCenterId,
  branch,
}: PowerOutageRequestFormProps) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [requests, setRequests] = useState<PowerOutageRequestInput[]>([]);
  const [submitStatus, setSubmitStatus] = useState<{
    success: boolean;
    message: string;
    isLoading?: boolean;
  } | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<PowerOutageRequestInput>({
    resolver: zodResolver(PowerOutageRequestSchema),
    defaultValues: {
      workCenterId: workCenterId,
      branchId: branch,
    },
  });

  const watchWorkCenterId = watch("workCenterId");

  // คำนวณจำนวนวันที่เหลือจากวันปัจจุบัน
  const getDaysFromToday = (date: string) => {
    if (!date) return null;
    const selectedDate = dayjs(date);
    const today = dayjs();
    return selectedDate.diff(today, 'day');
  };

  const watchedOutageDate = watch("outageDate");
  const daysFromToday = getDaysFromToday(watchedOutageDate);

  // คำนวณวันที่ขั้นต่ำที่สามารถเลือกได้ (มากกว่า 10 วันจากวันปัจจุบัน)
  const getMinSelectableDate = () => {
    const today = dayjs();
    const minDate = today.add(11, 'day');
    return minDate.format('YYYY-MM-DD');
  };

  const minSelectableDate = getMinSelectableDate();

  useEffect(() => {
    if (role !== "ADMIN") {
      if (workCenterId) {
        setValue("workCenterId", workCenterId);
        loadBranches(Number(workCenterId));
      }
      if (branch) {
        setValue("branchId", branch);
      }
    } else if (watchWorkCenterId) {
      loadBranches(Number(watchWorkCenterId));
    }
  }, [role, workCenterId, branch, watchWorkCenterId, setValue]);

  const loadBranches = async (workCenterId: number) => {
    const branchData = await getBranches(workCenterId);
    setBranches(branchData);
  };

  const handleTransformerSearch = async (searchTerm: string) => {
    if (searchTerm.length >= 2) {
      const results = await searchTransformers(searchTerm);
      setTransformers(results);
    } else {
      setTransformers([]);
    }
  };

  const handleTransformerSelect = (transformer: Transformer) => {
    setValue("transformerNumber", transformer.transformerNumber);
    setValue("gisDetails", transformer.gisDetails);
    setTransformers([]);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = event.target.value;
    const selectedDayjs = dayjs(selectedDate);
    const minDate = dayjs(minSelectableDate);
    
    if (selectedDate && selectedDayjs.isBefore(minDate)) {
      setTimeError(`วันที่ที่เลือกไม่ถูกต้อง กรุณาเลือกวันที่ ${minDate.format('DD/MM/YYYY')} หรือหลังจากนั้น`);
    } else {
      setTimeError(null);
    }
    
    // อัปเดตค่าใน form
    setValue("outageDate", selectedDate);
  };

  const validateDateAndTime = useCallback((data: PowerOutageRequestInput): boolean => {
    const outageDate = dayjs(data.outageDate);
    const minDate = dayjs(minSelectableDate);
    const startTime = dayjs(`${data.outageDate} ${data.startTime}`);
    const endTime = dayjs(`${data.outageDate} ${data.endTime}`);
  
    if (outageDate.isBefore(minDate)) {
      setTimeError(`วันที่ดับไฟต้องเป็นวันที่ ${minDate.format('DD/MM/YYYY')} หรือหลังจากนั้น (มากกว่า 10 วันจากวันปัจจุบัน)`);
      return false;
    }
  
    if (endTime.isSame(startTime) || endTime.isBefore(startTime)) {
      setTimeError("เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น");
      return false;
    }
  
    setTimeError(null);
    return true;
  }, [minSelectableDate, setTimeError]);

  const onSubmit = useCallback(
    async (data: PowerOutageRequestInput) => {
      if (!validateDateAndTime(data)) return;

      try {
        const result = await createPowerOutageRequest(data);
        if (result.success) {
          setSubmitStatus({
            success: true,
            message: "คำขอถูกบันทึกเรียบร้อยแล้ว",
          });
          reset();
          router.push("/power-outage-requests");
        } else {
          setSubmitStatus({
            success: false,
            message: result.error || "เกิดข้อผิดพลาดในการบันทึกคำขอ",
          });
        }
      } catch (error) {
        setSubmitStatus({
          success: false,
          message: "เกิดข้อผิดพลาดในการบันทึกคำขอ",
        });
      }
    },
    [reset, router, validateDateAndTime]
  );

  const onAddToList = useCallback(
    (data: PowerOutageRequestInput) => {
      if (!validateDateAndTime(data)) return;

      setRequests((prev) => [...prev, data]);
      setSubmitStatus({
        success: true,
        message: "คำขอถูกเพิ่มเข้าสู่รายการแล้ว",
      });
      reset();
    },
    [reset, validateDateAndTime]
  );

  const removeFromList = (index: number) => {
    setRequests((prev) => prev.filter((_, i) => i !== index));
    setSubmitStatus({
      success: true,
      message: "ลบรายการออกจากรายการรอบันทึกแล้ว",
    });
  };

  const clearAllRequests = () => {
    setRequests([]);
    setSubmitStatus({
      success: true,
      message: "ล้างรายการทั้งหมดแล้ว",
    });
  };

  const handleSubmitAll = async () => {
    if (requests.length === 0) {
      setSubmitStatus({
        success: false,
        message: "ไม่มีคำขอในรายการ",
      });
      return;
    }

    try {
      // แสดงสถานะกำลังประมวลผล
      setSubmitStatus({
        success: true,
        message: `กำลังบันทึกคำขอ ${requests.length} รายการ...`,
      });

      const result = await createMultiplePowerOutageRequests(requests);
      
      if (result.success) {
        // บันทึกสำเร็จทั้งหมด
        setRequests([]);
        setSubmitStatus({
          success: true,
          message: result.message || `บันทึกคำขอสำเร็จทั้งหมด ${result.successCount} รายการ`,
        });
        reset();
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        // มีข้อผิดพลาด
        if (result.validationErrors && result.validationErrors.length > 0) {
          // แสดงรายละเอียดข้อผิดพลาดแต่ละรายการ
          const errorDetails = result.validationErrors
            .map(err => `รายการที่ ${err.index}: ${err.error}`)
            .join('\n');
          
          setSubmitStatus({
            success: false,
            message: `พบข้อผิดพลาด ${result.validationErrors.length} รายการ:\n${errorDetails}`,
          });
        } else {
          setSubmitStatus({
            success: false,
            message: result.error || "เกิดข้อผิดพลาดในการบันทึกคำขอ",
          });
        }
      }
    } catch (error) {
      console.error("Error in handleSubmitAll:", error);
      setSubmitStatus({
        success: false,
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์",
      });
    }
  };
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="outageDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              วันที่ดับไฟ
              <span className="text-xs text-gray-500 ml-2">
                (ต้องมากกว่า 10 วันจากวันปัจจุบัน)
              </span>
            </label>
            <input
              type="date"
              id="outageDate"
              min={minSelectableDate}
              {...register("outageDate")}
              onChange={handleDateChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                errors.outageDate || timeError
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              }`}
            />
            {errors.outageDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.outageDate.message}
              </p>
            )}
            <div className="mt-1 space-y-1">
              <p className="text-xs text-gray-500">
                วันที่เร็วที่สุดที่สามารถเลือกได้: <span className="font-medium text-green-600">{dayjs(minSelectableDate).format('DD/MM/YYYY')}</span>
              </p>
              {watchedOutageDate && (
                <p className={`text-xs font-medium ${
                  daysFromToday !== null && daysFromToday > 10 
                    ? "text-green-600" 
                    : "text-red-600"
                }`}>
                  {daysFromToday !== null && (
                    <>
                      {daysFromToday > 10 
                        ? `✅ วันที่เลือก: ${dayjs(watchedOutageDate).format('DD/MM/YYYY')} (${daysFromToday} วันจากวันนี้)`
                        : `❌ วันที่เลือกไม่ถูกต้อง: ${dayjs(watchedOutageDate).format('DD/MM/YYYY')} (เหลือเพียง ${daysFromToday} วัน)`
                      }
                    </>
                  )}
                </p>
              )}
              <p className="text-xs text-blue-600">
                💡 เคล็ดลับ: วันที่ในปฏิทินที่เป็นสีเทาจะไม่สามารถเลือกได้
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              เวลาเริ่มต้น
            </label>
            <Controller
              name="startTime"
              control={control}
              render={({ field: { onChange, value } }) => (
                <MobileTimePicker
                  value={value ? dayjs(value, "HH:mm") : null}
                  onChange={(newValue: dayjs.Dayjs | null) => {
                    onChange(newValue ? newValue.format("HH:mm") : "");
                  }}
                  ampm={false}
                  format="HH:mm"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      error: !!errors.startTime,
                      helperText: errors.startTime?.message,
                      className:
                        "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500",
                    },
                  }}
                />
              )}
            />
          </div>

          <div>
            <label
              htmlFor="endTime"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              เวลาสิ้นสุด
            </label>
            <Controller
              name="endTime"
              control={control}
              render={({ field: { onChange, value } }) => (
                <MobileTimePicker
                  value={value ? dayjs(value, "HH:mm") : null}
                  onChange={(newValue: dayjs.Dayjs | null) => {
                    onChange(newValue ? newValue.format("HH:mm") : "");
                  }}
                  ampm={false}
                  format="HH:mm"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      error: !!errors.endTime,
                      helperText: errors.endTime?.message,
                      className:
                        "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500",
                    },
                  }}
                />
              )}
            />
          </div>

          {role === "ADMIN" && (
            <>
              <div>
                <label
                  htmlFor="workCenterId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  ศูนย์งาน
                </label>
                <select
                  id="workCenterId"
                  {...register("workCenterId")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">เลือกศูนย์งาน</option>
                  {workCenters?.map((wc) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.name}
                    </option>
                  ))}
                </select>
                {errors.workCenterId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.workCenterId.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="branchId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  สาขา
                </label>
                <select
                  id="branchId"
                  {...register("branchId")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">เลือกสาขา</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.shortName}
                    </option>
                  ))}
                </select>
                {errors.branchId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.branchId.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="transformerNumber"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              หมายเลขหม้อแปลง
            </label>
            <input
              type="text"
              id="transformerNumber"
              {...register("transformerNumber", {
                onChange: (e) => handleTransformerSearch(e.target.value),
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.transformerNumber && (
              <p className="mt-1 text-sm text-red-600">
                {errors.transformerNumber.message}
              </p>
            )}
            {transformers.length > 0 && (
              <ul className="mt-2 border border-gray-200 rounded-md shadow-sm">
                {transformers.map((t) => (
                  <li
                    key={t.transformerNumber}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleTransformerSelect(t)}
                  >
                    {t.transformerNumber} - {t.gisDetails}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="gisDetails"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              สถานที่ติดตั้ง (GIS)
            </label>
            <input
              type="text"
              id="gisDetails"
              {...register("gisDetails")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              readOnly
            />
          </div>

          <div>
            <label
              htmlFor="area"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              พื้นที่ไฟดับ
            </label>
            <input
              type="text"
              id="area"
              {...register("area")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.area && (
              <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>
            )}
          </div>
        </div>

        {timeError && (
          <div className="p-4 bg-red-100 text-red-700 rounded-md">
            {timeError}
          </div>
        )}

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={handleSubmit(onAddToList)}
            disabled={daysFromToday !== null && daysFromToday <= 10}
            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              daysFromToday !== null && daysFromToday <= 10
                ? "bg-gray-300 text-gray-500 cursor-not-allowed focus:ring-gray-400"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500"
            }`}
            title={daysFromToday !== null && daysFromToday <= 10 ? "กรุณาเลือกวันที่ที่ถูกต้อง (มากกว่า 10 วันจากวันนี้)" : ""}
          >
            เพิ่มเข้ารายการ
          </button>
          <button
            type="submit"
            disabled={daysFromToday !== null && daysFromToday <= 10}
            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              daysFromToday !== null && daysFromToday <= 10
                ? "bg-gray-300 text-gray-500 cursor-not-allowed focus:ring-gray-400"
                : "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500"
            }`}
            title={daysFromToday !== null && daysFromToday <= 10 ? "กรุณาเลือกวันที่ที่ถูกต้อง (มากกว่า 10 วันจากวันนี้)" : ""}
          >
            บันทึกคำขอนี้
          </button>
        </div>

        {daysFromToday !== null && daysFromToday <= 10 && watchedOutageDate && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">ไม่สามารถบันทึกได้:</span> วันที่ที่เลือกต้องมากกว่า 10 วันจากวันปัจจุบัน 
                  กรุณาเลือกวันที่ {dayjs(minSelectableDate).format('DD/MM/YYYY')} หรือหลังจากนั้น
                </p>
              </div>
            </div>
          </div>
        )}
      </form>

      {submitStatus && (
        <div
          className={`p-4 rounded-md ${
            submitStatus.success
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-red-100 text-red-700 border border-red-200"
          }`}
        >
          <div className="flex items-start space-x-2">
            {submitStatus.isLoading && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
            )}
            <div className="flex-1">
              {submitStatus.message.includes('\n') ? (
                <pre className="whitespace-pre-wrap text-sm font-medium">
                  {submitStatus.message}
                </pre>
              ) : (
                <p className="text-sm font-medium">{submitStatus.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-8 p-6 bg-gray-50 border-t border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              รายการคำขอที่รอการบันทึก ({requests.length} รายการ)
            </h3>
            <button
              onClick={clearAllRequests}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              ล้างทั้งหมด
            </button>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {requests.map((request, index) => (
              <div key={index} className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">หม้อแปลง:</span>{" "}
                        <span className="text-gray-900">{request.transformerNumber}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">วันที่:</span>{" "}
                        <span className="text-gray-900">{request.outageDate}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">เวลา:</span>{" "}
                        <span className="text-gray-900">{request.startTime} - {request.endTime}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">สถานที่:</span>{" "}
                        <span className="text-gray-900">{request.gisDetails}</span>
                      </div>
                      {request.area && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-600">พื้นที่ไฟดับ:</span>{" "}
                          <span className="text-gray-900">{request.area}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromList(index)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    title="ลบรายการนี้"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-600">
              รวม {requests.length} รายการรอการบันทึก
            </div>
            <button
              onClick={handleSubmitAll}
              disabled={submitStatus?.isLoading}
              className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex items-center space-x-2 ${
                submitStatus?.isLoading
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {submitStatus?.isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              )}
              <span>
                {submitStatus?.isLoading ? "กำลังบันทึก..." : "บันทึกคำขอทั้งหมด"}
              </span>
            </button>
          </div>
        </div>
      )}
    </LocalizationProvider>
  );
}
