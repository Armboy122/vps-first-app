"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
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

  const {
    register,
    handleSubmit,
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

  const onSubmit = useCallback(
    async (data: PowerOutageRequestInput) => {
      const start = new Date(`${data.outageDate}T${data.startTime}`);
      const end = new Date(`${data.outageDate}T${data.endTime}`);

      if (end <= start) {
        setSubmitStatus({
          success: false,
          message: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น",
        });
        return;
      }

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
      const start = new Date(`${data.outageDate}T${data.startTime}`);
      const end = new Date(`${data.outageDate}T${data.endTime}`);

      if (end <= start) {
        setSubmitStatus({
          success: false,
          message: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น",
        });
        return;
      }

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
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="outageDate"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              วันที่ดับไฟ:
            </label>
            <input
              type="date"
              id="outageDate"
              {...register("outageDate")}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {errors.outageDate && (
              <p className="text-red-500 text-xs italic">
                {errors.outageDate.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="startTime"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              เวลาเริ่มต้น:
            </label>
            <input
              type="time"
              id="startTime"
              {...register("startTime")}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {errors.startTime && (
              <p className="text-red-500 text-xs italic">
                {errors.startTime.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="endTime"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              เวลาสิ้นสุด:
            </label>
            <input
              type="time"
              id="endTime"
              {...register("endTime")}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {errors.endTime && (
              <p className="text-red-500 text-xs italic">
                {errors.endTime.message}
              </p>
            )}
          </div>

          {role === "ADMIN" && (
            <>
              <div>
                <label
                  htmlFor="workCenterId"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  ศูนย์งาน:
                </label>
                <select
                  id="workCenterId"
                  {...register("workCenterId")}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">เลือกศูนย์งาน</option>
                  {workCenters?.map((wc) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.name}
                    </option>
                  ))}
                </select>
                {errors.workCenterId && (
                  <p className="text-red-500 text-xs italic">
                    {errors.workCenterId.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="branchId"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  สาขา:
                </label>
                <select
                  id="branchId"
                  {...register("branchId")}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">เลือกสาขา</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.shortName}
                    </option>
                  ))}
                </select>
                {errors.branchId && (
                  <p className="text-red-500 text-xs italic">
                    {errors.branchId.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="relative">
            <label
              htmlFor="transformerNumber"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              หมายเลขหม้อแปลง:
            </label>
            <input
              type="text"
              id="transformerNumber"
              {...register("transformerNumber", {
                onChange: (e) => handleTransformerSearch(e.target.value),
              })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {errors.transformerNumber && (
              <p className="text-red-500 text-xs italic">
                {errors.transformerNumber.message}
              </p>
            )}
            {transformers.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg">
                {transformers.map((t) => (
                  <li
                    key={t.transformerNumber}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
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
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              รายละเอียด GIS:
            </label>
            <input
              type="text"
              id="gisDetails"
              {...register("gisDetails")}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
              readOnly
            />
            {errors.gisDetails && (
              <p className="text-red-500 text-xs italic">
                {errors.gisDetails.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="area"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              พื้นที่:
            </label>
            <input
              type="text"
              id="area"
              {...register("area")}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {errors.area && (
              <p className="text-red-500 text-xs italic">
                {errors.area.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            บันทึกคำขอนี้
          </button>
          <button
            type="button"
            onClick={handleSubmit(onAddToList)}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            เพิ่มเข้ารายการ
          </button>
        </div>
      </form>

      {submitStatus && (
        <div
          className={`mt-4 p-4 rounded ${
            submitStatus.success
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-8 bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-bold mb-4">รายการคำขอที่รอการบันทึก</h2>
          <ul className="space-y-2">
            {requests.map((request, index) => (
              <li key={index} className="bg-white p-3 rounded shadow">
                หม้อแปลง: {request.transformerNumber}, วันที่:{" "}
                {request.outageDate}
              </li>
            ))}
          </ul>
          <button
            onClick={handleSubmitAll}
            className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            บันทึกคำขอทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}
