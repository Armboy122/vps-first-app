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

  const validateDateAndTime = (data: PowerOutageRequestInput): boolean => {
    const today = dayjs().startOf('day');
    const outageDate = dayjs(data.outageDate);
    const startTime = dayjs(`${data.outageDate} ${data.startTime}`);
    const endTime = dayjs(`${data.outageDate} ${data.endTime}`);
  
    if (outageDate.isBefore(today)) {
      setTimeError("วันที่ดับไฟต้องไม่เป็นวันในอดีต");
      return false;
    }
  
    if (endTime.isSame(startTime) || endTime.isBefore(startTime)) {
      setTimeError("เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น");
      return false;
    }
  
    setTimeError(null);
    return true;
  };

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
    [reset, router]
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
    [reset]
  );

  const handleSubmitAll = async () => {
    try {
      for (const request of requests) {
        await createPowerOutageRequest(request);
      }
      setRequests([]);
      setSubmitStatus({
        success: true,
        message: "คำขอทั้งหมดถูกบันทึกเรียบร้อยแล้ว",
      });
      reset();
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: "เกิดข้อผิดพลาดในการบันทึกคำขอ",
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
            </label>
            <input
              type="date"
              id="outageDate"
              {...register("outageDate")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.outageDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.outageDate.message}
              </p>
            )}
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
              รายละเอียด GIS
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
              พื้นที่
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
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
          >
            เพิ่มเข้ารายการ
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            บันทึกคำขอนี้
          </button>
        </div>
      </form>

      {submitStatus && (
        <div
          className={`p-4 ${
            submitStatus.success
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-8 p-6 bg-gray-50 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            รายการคำขอที่รอการบันทึก
          </h3>
          <ul className="space-y-2">
            {requests.map((request, index) => (
              <li key={index} className="bg-white p-3 rounded-md shadow-sm">
                หม้อแปลง: {request.transformerNumber}, วันที่:{" "}
                {request.outageDate}
              </li>
            ))}
          </ul>
          <button
            onClick={handleSubmitAll}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            บันทึกคำขอทั้งหมด
          </button>
        </div>
      )}
    </LocalizationProvider>
  );
}
