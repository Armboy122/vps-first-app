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
  { value: "USER", label: "พนักงานหม้อแปลง", color: "bg-blue-100 text-blue-800" },
  { value: "SUPERVISOR", label: "พนักงาน EO", color: "bg-green-100 text-green-800" },
  { value: "MANAGER", label: "ผู้บริหารจุดรวมงาน", color: "bg-purple-100 text-purple-800" },
  { value: "ADMIN", label: "Admin", color: "bg-red-100 text-red-800" },
  { value: "VIEWER", label: "กฟต.3", color: "bg-gray-100 text-gray-800" }
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

  // Debounced function สำหรับตรวจสอบรหัสพนักงาน
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

  // ตรวจสอบรหัสพนักงานเมื่อมีการเปลี่ยนแปลง
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
    
    // Cleanup function เพื่อยกเลิก debounce ที่กำลัง pending
    return () => {
      debouncedCheckEmployeeId.cancel();
    };
  }, [employeeId, debouncedCheckEmployeeId]);

  // อัพเดทรหัสผ่านให้ตรงกับรหัสพนักงานอัตโนมัติ
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

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Employee ID Field */}
        <div className="space-y-2">
          <label htmlFor="employeeId" className="block text-sm font-semibold text-gray-700">
            🏷️ รหัสพนักงาน
          </label>
          <Controller
            name="employeeId"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <input
                  {...field}
                  type="text"
                  placeholder="กรอกรหัสพนักงาน 6 ตัวอักษร"
                  className={`w-full p-3 pr-12 border rounded-lg transition-colors ${
                    errors.employeeId || employeeIdCheck.exists ? 'border-red-300 bg-red-50' : 
                    employeeIdCheck.message && !employeeIdCheck.exists && !employeeIdCheck.error ? 'border-green-300 bg-green-50' :
                    'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                  maxLength={10}
                />
                {/* Status Icon */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {employeeIdCheck.isChecking ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                  ) : employeeIdCheck.exists ? (
                    <span className="text-red-500 text-lg">❌</span>
                  ) : employeeIdCheck.message && !employeeIdCheck.error ? (
                    <span className="text-green-500 text-lg">✅</span>
                  ) : null}
                </div>
              </div>
            )}
          />
          
          {/* Error Messages */}
          {errors.employeeId && (
            <p className="text-sm text-red-600 flex items-center">
              <span className="mr-1">⚠️</span>
              {errors.employeeId.message}
            </p>
          )}
          
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
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
            🔐 รหัสผ่าน
          </label>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <input
                  {...field}
                  type="text"
                  placeholder="รหัสผ่านจะถูกตั้งเป็นรหัสพนักงานอัตโนมัติ"
                  className={`w-full p-3 border rounded-lg transition-colors ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                  readOnly={employeeId ? employeeId.length >= 6 : false}
                />
                {employeeId && employeeId.length >= 6 && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-green-500">🔒</span>
                  </div>
                )}
              </div>
            )}
          />
          {errors.password && (
            <p className="text-sm text-red-600 flex items-center">
              <span className="mr-1">⚠️</span>
              {errors.password.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
            💡 รหัสผ่านจะถูกตั้งให้เหมือนกับรหัสพนักงานโดยอัตโนมัติ ผู้ใช้สามารถเปลี่ยนได้ภายหลัง
          </p>
        </div>

        {/* Full Name Field */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700">
            👤 ชื่อ-นามสกุล
          </label>
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                placeholder="กรอกชื่อ-นามสกุล"
                className={`w-full p-3 border rounded-lg transition-colors ${
                  errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
              />
            )}
          />
          {errors.fullName && (
            <p className="text-sm text-red-600 flex items-center">
              <span className="mr-1">⚠️</span>
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Work Center Field */}
        <div className="space-y-2">
          <label htmlFor="workCenterId" className="block text-sm font-semibold text-gray-700">
            🏢 จุดรวมงาน
          </label>
          <Controller
            name="workCenterId"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className={`w-full p-3 border rounded-lg transition-colors ${
                  errors.workCenterId ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                <option value="">เลือกจุดรวมงาน</option>
                {workCenters.map((wc) => (
                  <option key={wc.id} value={wc.id}>{wc.name}</option>
                ))}
              </select>
            )}
          />
          {errors.workCenterId && (
            <p className="text-sm text-red-600 flex items-center">
              <span className="mr-1">⚠️</span>
              {errors.workCenterId.message}
            </p>
          )}
        </div>

        {/* Branch Field */}
        <div className="space-y-2">
          <label htmlFor="branchId" className="block text-sm font-semibold text-gray-700">
            🏪 สาขา
          </label>
          <Controller
            name="branchId"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className={`w-full p-3 border rounded-lg transition-colors ${
                  errors.branchId ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                disabled={!selectedWorkCenter}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                <option value="">
                  {!selectedWorkCenter ? "กรุณาเลือกจุดรวมงานก่อน" : "เลือกสาขา"}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.shortName} - {branch.fullName}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.branchId && (
            <p className="text-sm text-red-600 flex items-center">
              <span className="mr-1">⚠️</span>
              {errors.branchId.message}
            </p>
          )}
          {isLoading && selectedWorkCenter && (
            <p className="text-sm text-blue-600 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
              กำลังโหลดรายชื่อสาขา...
            </p>
          )}
        </div>

        {/* Role Field */}
        <div className="space-y-2">
          <label htmlFor="role" className="block text-sm font-semibold text-gray-700">
            👑 บทบาท
          </label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className={`w-full p-3 border rounded-lg transition-colors ${
                  errors.role ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
              >
                <option value="">เลือกบทบาท</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.role && (
            <p className="text-sm text-red-600 flex items-center">
              <span className="mr-1">⚠️</span>
              {errors.role.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-6">
          <button
            type="submit"
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
              isSubmitting || !isValid || employeeIdCheck.exists || employeeIdCheck.isChecking
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-[1.02]"
            } focus:outline-none focus:ring-4 focus:ring-blue-200`}
            disabled={isSubmitting || !isValid || employeeIdCheck.exists || employeeIdCheck.isChecking}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                กำลังสร้างผู้ใช้...
              </span>
            ) : employeeIdCheck.isChecking ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                กำลังตรวจสอบรหัสพนักงาน...
              </span>
            ) : employeeIdCheck.exists ? (
              <span className="flex items-center justify-center">
                <span className="mr-2">❌</span>
                รหัสพนักงานซ้ำ - ไม่สามารถสร้างได้
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">✨</span>
                สร้างผู้ใช้
              </span>
            )}
          </button>
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