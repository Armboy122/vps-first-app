"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUser, checkEmployeeIdExists } from "../app/api/action/User";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { CreateUserSchema } from "@/lib/validations/user";
import {
  getWorkCenters,
  getBranches,
} from "@/app/api/action/getWorkCentersAndBranches";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { FormField, FormInput, FormSelect, FormButton } from "@/components/forms";

type WorkCenter = {
  id: number;
  name: string;
};

type Branch = {
  id: number;
  shortName: string;
  fullName?: string;
  workCenterId: number;
};

type FormData = z.infer<typeof CreateUserSchema>;

const ROLE_OPTIONS = [
  { value: "USER", label: "พนักงานหม้อแปลง" },
  { value: "SUPERVISOR", label: "พนักงาน EO" },
  { value: "MANAGER", label: "ผู้บริหารจุดรวมงาน" },
  { value: "ADMIN", label: "Admin" },
  { value: "VIEWER", label: "กฟต.3" }
];

export default function CreateUserForm() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeIdCheck, setEmployeeIdCheck] = useState<{
    isChecking: boolean;
    exists: boolean;
    message: string;
    error?: boolean;
  }>({
    isChecking: false,
    exists: false,
    message: ""
  });
  const router = useRouter();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
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
    mode: "onChange"
  });

  const selectedWorkCenter = watch("workCenterId");
  const employeeId = watch("employeeId");

  // Debounced function for employee ID check
  const debouncedCheckEmployeeId = useMemo(
    () => debounce(async (empId: string) => {
      if (!empId || empId.length < 6) {
        setEmployeeIdCheck({
          isChecking: false,
          exists: false,
          message: ""
        });
        return;
      }

      setEmployeeIdCheck(prev => ({ ...prev, isChecking: true }));
      
      try {
        const result = await checkEmployeeIdExists(empId);
        setEmployeeIdCheck({
          isChecking: false,
          exists: result.exists,
          message: result.message,
          error: result.error
        });
      } catch (error) {
        setEmployeeIdCheck({
          isChecking: false,
          exists: false,
          message: "เกิดข้อผิดพลาดในการตรวจสอบ",
          error: true
        });
      }
    }, 800),
    []
  );

  // Check employee ID when it changes
  useEffect(() => {
    if (employeeId) {
      debouncedCheckEmployeeId(employeeId);
    } else {
      setEmployeeIdCheck({
        isChecking: false,
        exists: false,
        message: ""
      });
    }
    
    return () => {
      debouncedCheckEmployeeId.cancel();
    };
  }, [employeeId, debouncedCheckEmployeeId]);

  // Auto-update password to match employee ID
  useEffect(() => {
    if (employeeId && employeeId.length >= 6) {
      setValue("password", employeeId, { shouldValidate: true });
    }
  }, [employeeId, setValue]);

  useEffect(() => {
    const loadWorkCenters = async () => {
      setIsLoading(true);
      try {
        const centers = await getWorkCenters();
        setWorkCenters(centers);
      } catch (err) {
        setError("ไม่สามารถโหลดข้อมูลจุดรวมงานได้");
      } finally {
        setIsLoading(false);
      }
    };
    loadWorkCenters();
  }, []);

  useEffect(() => {
    const loadBranches = async () => {
      if (selectedWorkCenter) {
        setIsLoading(true);
        try {
          const branchList = await getBranches(Number(selectedWorkCenter));
          setBranches(branchList);
        } catch (err) {
          setError("ไม่สามารถโหลดข้อมูลสาขาได้");
        } finally {
          setIsLoading(false);
        }
      } else {
        setBranches([]);
      }
      setValue("branchId", 0);
    };
    loadBranches();
  }, [selectedWorkCenter, setValue]);

  const onSubmit = async (data: FormData) => {
    setError("");
    setIsSubmitting(true);
    
    try {
      const result = await createUser(data);
      if (result.success) {
        alert(`✅ สร้างผู้ใช้เรียบร้อยแล้ว!\n\nชื่อ: ${data.fullName}\nรหัสพนักงาน: ${data.employeeId}\nรหัสผ่าน: ${data.password}\n\nกำลังกลับสู่หน้ารายชื่อผู้ใช้...`);
        router.push("/admin");
      } else {
        setError(`ไม่สามารถสร้างผู้ใช้ได้: ${result.error}`);
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการสร้างผู้ใช้");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && workCenters.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  const workCenterOptions = workCenters.map(wc => ({ value: wc.id, label: wc.name }));
  const branchOptions = branches.map(branch => ({ value: branch.id, label: `${branch.shortName} - ${branch.fullName}` }));

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Employee ID Field */}
        <FormField
          label="รหัสพนักงาน"
          name="employeeId"
          error={errors.employeeId}
          required
          icon="🏷️"
        >
          <Controller
            name="employeeId"
            control={control}
            render={({ field }) => (
              <FormInput
                {...field}
                type="text"
                placeholder="กรอกรหัสพนักงาน 6 ตัวอักษร"
                maxLength={10}
                error={errors.employeeId || (employeeIdCheck.exists ? { message: employeeIdCheck.message } as any : undefined)}
                icon={
                  employeeIdCheck.isChecking ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                  ) : employeeIdCheck.exists ? (
                    <span className="text-red-500 text-lg">❌</span>
                  ) : employeeIdCheck.message && !employeeIdCheck.error ? (
                    <span className="text-green-500 text-lg">✅</span>
                  ) : null
                }
              />
            )}
          />
          
          {/* Employee ID Check Status */}
          {!errors.employeeId && employeeIdCheck.message && (
            <p className={`text-sm flex items-center ${
              employeeIdCheck.exists || employeeIdCheck.error ? 'text-red-600' : 'text-green-600'
            }`}>
              <span className="mr-1">
                {employeeIdCheck.isChecking ? "🔍" : 
                 employeeIdCheck.exists ? "❌" : 
                 employeeIdCheck.error ? "⚠️" : "✅"}
              </span>
              {employeeIdCheck.isChecking ? "กำลังตรวจสอบ..." : employeeIdCheck.message}
            </p>
          )}
          
          {/* Password Preview */}
          {employeeId && employeeId.length >= 6 && !employeeIdCheck.exists && (
            <p className="text-sm text-green-600 flex items-center">
              <span className="mr-1">🔐</span>
              รหัสผ่านจะถูกตั้งเป็น: {employeeId}
            </p>
          )}
        </FormField>

        {/* Password Field */}
        <FormField
          label="รหัสผ่าน"
          name="password"
          error={errors.password}
          required
          icon="🔐"
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <FormInput
                {...field}
                type="text"
                placeholder="รหัสผ่านจะถูกตั้งเป็นรหัสพนักงานอัตโนมัติ"
                readOnly={employeeId ? employeeId.length >= 6 : false}
                error={errors.password}
                icon={employeeId && employeeId.length >= 6 ? <span className="text-green-500">🔒</span> : undefined}
              />
            )}
          />
          <p className="text-xs text-gray-500">
            💡 รหัสผ่านจะถูกตั้งให้เหมือนกับรหัสพนักงานโดยอัตโนมัติ ผู้ใช้สามารถเปลี่ยนได้ภายหลัง
          </p>
        </FormField>

        {/* Full Name Field */}
        <FormField
          label="ชื่อ-นามสกุล"
          name="fullName"
          error={errors.fullName}
          required
          icon="👤"
        >
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <FormInput
                {...field}
                type="text"
                placeholder="กรอกชื่อ-นามสกุล"
                error={errors.fullName}
              />
            )}
          />
        </FormField>

        {/* Work Center Field */}
        <FormField
          label="จุดรวมงาน"
          name="workCenterId"
          error={errors.workCenterId}
          required
          icon="🏢"
        >
          <Controller
            name="workCenterId"
            control={control}
            render={({ field }) => (
              <FormSelect
                {...field}
                options={workCenterOptions}
                placeholder="เลือกจุดรวมงาน"
                error={errors.workCenterId}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
        </FormField>

        {/* Branch Field */}
        <FormField
          label="สาขา"
          name="branchId"
          error={errors.branchId}
          required
          icon="🏪"
        >
          <Controller
            name="branchId"
            control={control}
            render={({ field }) => (
              <FormSelect
                {...field}
                options={branchOptions}
                placeholder={!selectedWorkCenter ? "กรุณาเลือกจุดรวมงานก่อน" : "เลือกสาขา"}
                error={errors.branchId}
                disabled={!selectedWorkCenter}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
          {isLoading && selectedWorkCenter && (
            <p className="text-sm text-blue-600 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
              กำลังโหลดรายชื่อสาขา...
            </p>
          )}
        </FormField>

        {/* Role Field */}
        <FormField
          label="บทบาท"
          name="role"
          error={errors.role}
          required
          icon="👑"
        >
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <FormSelect
                {...field}
                options={ROLE_OPTIONS}
                placeholder="เลือกบทบาท"
                error={errors.role}
              />
            )}
          />
        </FormField>

        {/* Submit Button */}
        <div className="pt-6">
          <FormButton
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting || employeeIdCheck.isChecking}
            disabled={!isValid || employeeIdCheck.exists}
            className="w-full"
            icon={
              employeeIdCheck.isChecking ? undefined :
              employeeIdCheck.exists ? "❌" :
              isSubmitting ? undefined : "✨"
            }
          >
            {employeeIdCheck.exists 
              ? "รหัสพนักงานซ้ำ - ไม่สามารถสร้างได้"
              : "สร้างผู้ใช้"
            }
          </FormButton>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">❌</span>
              <span className="text-red-700 font-medium">เกิดข้อผิดพลาด:</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📝 ข้อมูลสำคัญ:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• ระบบจะตรวจสอบรหัสพนักงานซ้ำอัตโนมัติขณะพิมพ์</li>
            <li>• รหัสผ่านเริ่มต้นจะเป็นรหัสพนักงาน</li>
            <li>• ผู้ใช้สามารถเปลี่ยนรหัสผ่านได้ภายหลัง</li>
            <li>• ต้องเลือกจุดรวมงานก่อนจึงจะเลือกสาขาได้</li>
            <li>• รหัสพนักงานใช้ได้: a-z, A-Z, 0-9 (6-10 ตัวอักษร)</li>
          </ul>
        </div>
      </form>
    </div>
  );
}