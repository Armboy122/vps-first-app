"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUser,
} from "../app/api/action/User";
import { useState, useEffect } from "react";
import { z } from "zod";
import { CreateUserSchema } from "@/lib/validations/user";
import { getWorkCenters, getBranches } from "@/app/api/action/getWorkCentersAndBranches";

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

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      password: "",
      fullName: "",
      employeeId: "",
      workCenterId: 0,
      branchId: 0,
      role: "USER",
      status: "ACTIVE",
      permissions: [],
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

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="employeeId" className="block mb-1">
          รหัสพนักงาน
        </label>
        <Controller
          name="employeeId"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              className="w-full p-2 border rounded"
            />
          )}
        />
        {errors.employeeId && <span className="text-red-500">{errors.employeeId.message}</span>}
      </div>

      <div>
        <label htmlFor="password" className="block mb-1">
          รหัสผ่าน
        </label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="password"
              className="w-full p-2 border rounded"
            />
          )}
        />
        {errors.password && <span className="text-red-500">{errors.password.message}</span>}
      </div>

      <div>
        <label htmlFor="fullName" className="block mb-1">
          ชื่อ-นามสกุล
        </label>
        <Controller
          name="fullName"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              className="w-full p-2 border rounded"
            />
          )}
        />
        {errors.fullName && <span className="text-red-500">{errors.fullName.message}</span>}
      </div>

      <div>
        <label htmlFor="workCenterId" className="block mb-1">
          ศูนย์งาน
        </label>
        <Controller
          name="workCenterId"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full p-2 border rounded"
              onChange={(e) => field.onChange(Number(e.target.value))}
            >
              <option value="">เลือกศูนย์งาน</option>
              {workCenters.map((wc) => (
                <option key={wc.id} value={wc.id}>
                  {wc.name}
                </option>
              ))}
            </select>
          )}
        />
        {errors.workCenterId && <span className="text-red-500">{errors.workCenterId.message}</span>}
      </div>

      <div>
        <label htmlFor="branchId" className="block mb-1">
          สาขา
        </label>
        <Controller
          name="branchId"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full p-2 border rounded"
              disabled={!selectedWorkCenter}
              onChange={(e) => field.onChange(Number(e.target.value))}
            >
              <option value="">เลือกสาขา</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.shortName}
                </option>
              ))}
            </select>
          )}
        />
        {errors.branchId && <span className="text-red-500">{errors.branchId.message}</span>}
      </div>

      <div>
        <label htmlFor="role" className="block mb-1">
          บทบาท
        </label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <select {...field} className="w-full p-2 border rounded">
              <option value="USER">User</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          )}
        />
        {errors.role && <span className="text-red-500">{errors.role.message}</span>}
      </div>

      <div>
        <label htmlFor="status" className="block mb-1">
          สถานะ
        </label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <select {...field} className="w-full p-2 border rounded">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          )}
        />
        {errors.status && <span className="text-red-500">{errors.status.message}</span>}
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        disabled={isLoading}
      >
        {isLoading ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
      </button>

      {error && <div className="text-red-500">{error}</div>}
    </form>
  );
}