"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUser } from "../app/api/action/User";
import { useState, useEffect } from "react";
import { z } from "zod";
import { CreateUserSchema } from "@/lib/validations/user";
import {
  getWorkCenters,
  getBranches,
} from "@/app/api/action/getWorkCentersAndBranches";

type WorkCenter = {
  id: number;
  name: string;
};

type Branch = {
  id: number;
  shortName: string;
  workCenterId: number;
};

type FormData = z.infer<typeof CreateUserSchema>;

export default function CreateUserForm() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      password: "",
      fullName: "",
      employeeId: "",
      workCenterId: 0,
      branchId: 0,
      role: "USER",
    },
  });

  const selectedWorkCenter = watch("workCenterId");

  useEffect(() => {
    setIsLoading(true);
    getWorkCenters()
      .then(setWorkCenters)
      .catch((err) => setError("Failed to load work centers"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedWorkCenter) {
      setIsLoading(true);
      getBranches(Number(selectedWorkCenter))
        .then(setBranches)
        .catch((err) => setError("Failed to load branches"))
        .finally(() => setIsLoading(false));
    } else {
      setBranches([]);
    }
    setValue("branchId", 0);
  }, [selectedWorkCenter, setValue]);

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      setIsLoading(true);
      const result = await createUser(data);
      if (result.success) {
        alert("User created successfully!");
        reset();
      } else {
        setError(`Failed to create user: ${result.error}`);
      }
    } catch (err) {
      setError("An error occurred while creating the user");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center py-4">กำลังโหลด...</div>;
  if (error) return <div className="text-red-500 text-center py-4">ข้อผิดพลาด: {error}</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {['employeeId', 'password', 'fullName'].map((fieldName) => (
        <div key={fieldName}>
          <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-1">
            {fieldName === 'employeeId' ? 'รหัสพนักงาน' : fieldName === 'password' ? 'รหัสผ่าน' : 'ชื่อ-นามสกุล'}
          </label>
          <Controller
            name={fieldName as keyof FormData}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type={fieldName === 'password' ? 'password' : 'text'}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          />
          {errors[fieldName as keyof FormData] && (
            <p className="mt-1 text-sm text-red-600">{errors[fieldName as keyof FormData]?.message}</p>
          )}
        </div>
      ))}

      {['workCenterId', 'branchId', 'role'].map((fieldName) => (
        <div key={fieldName}>
          <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-1">
            {fieldName === 'workCenterId' ? 'จุดรวมงาน' : fieldName === 'branchId' ? 'สาขา' : 'บทบาท'}
          </label>
          <Controller
            name={fieldName as keyof FormData}
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={fieldName === 'branchId' && !selectedWorkCenter}
                onChange={(e) => {
                  const value = fieldName === 'role' ? e.target.value : Number(e.target.value);
                  field.onChange(value);
                }}
              >
                <option value="">เลือก{fieldName === 'workCenterId' ? 'จุดรวมงาน' : fieldName === 'branchId' ? 'สาขา' : 'บทบาท'}</option>
                {fieldName === 'workCenterId' && workCenters.map((wc) => (
                  <option key={wc.id} value={wc.id}>{wc.name}</option>
                ))}
                {fieldName === 'branchId' && branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.shortName}</option>
                ))}
                {fieldName === 'role' && [
                  {value: "USER", label: "พนักงานหม้อแปลง"},
                  {value: "SUPERVISOR", label: "พนักงาน EO"},
                  {value: "MANAGER", label: "ผู้บริหารจุดรวมงาน"},
                  {value: "ADMIN", label: "Admin"},
                  {value: "VIEWER", label: "กฟต.3"}
                ].map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            )}
          />
          {errors[fieldName as keyof FormData] && (
            <p className="mt-1 text-sm text-red-600">{errors[fieldName as keyof FormData]?.message}</p>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={isLoading}
        >
          {isLoading ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
        </button>
      </div>

      {error && <div className="mt-4 text-red-500 text-center">{error}</div>}
    </form>
  );
}