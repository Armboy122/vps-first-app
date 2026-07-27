"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { z } from "zod";
import { CreateUserSchema } from "@/lib/validations/user";
import { useRouter } from "next/navigation";
import {
  FormField,
  FormInput,
  FormSelect,
  FormButton,
} from "@/components/forms";
import { useWorkCenters } from "@/hooks/queries/useWorkCenters";
import { useBranches } from "@/hooks/queries/useBranches";
import { useCreateUser, useCheckEmployeeId } from "@/hooks/queries/useUsers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { FeedbackBanner } from "@/app/admin/components/shared/FeedbackBanner";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  GitBranch,
  Info,
  KeyRound,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

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
  { value: "VIEWER", label: "กฟต.3" },
];

export default function CreateUserForm() {
  const [feedback, setFeedback] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
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
    mode: "onChange",
  });

  const selectedWorkCenter = watch("workCenterId");
  const employeeId = watch("employeeId");

  // Debounced employee ID for checking
  const debouncedEmployeeId = useDebouncedValue(employeeId, 800);

  // React Query hooks
  const { data: workCenters = [], isLoading: workCentersLoading } =
    useWorkCenters();
  const { data: branches = [], isLoading: branchesLoading } = useBranches(
    selectedWorkCenter ? Number(selectedWorkCenter) : null,
  );
  const createUserMutation = useCreateUser();
  const { data: employeeIdCheckResult, isLoading: isCheckingEmployeeId } =
    useCheckEmployeeId(debouncedEmployeeId);

  useEffect(() => {
    if (!feedback || feedback.variant !== "success") return;

    const timer = setTimeout(() => {
      router.replace("/admin");
    }, 1400);

    return () => clearTimeout(timer);
  }, [feedback, router]);

  // Auto-update password to match employee ID
  useEffect(() => {
    if (employeeId && employeeId.length >= 6) {
      setValue("password", employeeId, { shouldValidate: true });
    }
  }, [employeeId, setValue]);

  // Reset branch when work center changes
  useEffect(() => {
    if (selectedWorkCenter) {
      setValue("branchId", 0);
    }
  }, [selectedWorkCenter, setValue]);

  const onSubmit = async (data: FormData) => {
    setFeedback(null);

    try {
      const result = await createUserMutation.mutateAsync(data);
      if (result.success) {
        setFeedback({
          variant: "success",
          title: "สร้างผู้ใช้เรียบร้อยแล้ว",
          message:
            "ระบบตั้งรหัสผ่านให้ตรงกับรหัสพนักงานเรียบร้อยแล้ว กำลังพากลับไปหน้าจัดการผู้ใช้",
        });
      } else {
        setFeedback({
          variant: "error",
          title: "ไม่สามารถสร้างผู้ใช้ได้",
          message: result.error || "เกิดข้อผิดพลาดในการสร้างผู้ใช้",
        });
      }
    } catch (err) {
      setFeedback({
        variant: "error",
        title: "เกิดข้อผิดพลาดในการสร้างผู้ใช้",
        message:
          err instanceof Error ? err.message : "กรุณาลองใหม่อีกครั้ง",
      });
    }
  };

  if (workCentersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pea-200 border-t-pea-700" />
        <span className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  // Extract employee ID check data
  const employeeIdCheck = {
    isChecking: isCheckingEmployeeId,
    exists: employeeIdCheckResult?.exists || false,
    message: employeeIdCheckResult?.message || "",
    error: employeeIdCheckResult?.error || false,
  };

  const workCenterOptions = workCenters.map((wc) => ({
    value: wc.id,
    label: wc.name,
  }));
  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: branch.shortName,
  }));

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {feedback && (
          <FeedbackBanner
            variant={feedback.variant}
            title={feedback.title}
            message={feedback.message}
          />
        )}

        {/* Employee ID Field */}
        <FormField
          label="รหัสพนักงาน"
          name="employeeId"
          error={errors.employeeId}
          required
          icon={<BadgeCheck className="h-4 w-4 text-pea-700" />}
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
                error={
                  errors.employeeId ||
                  (employeeIdCheck.exists
                    ? ({ message: employeeIdCheck.message } as any)
                    : undefined)
                }
                icon={
                  employeeIdCheck.isChecking ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-pea-200 border-t-pea-700" />
                  ) : employeeIdCheck.exists ? (
                    <CircleAlert className="h-5 w-5 text-red-600" />
                  ) : employeeIdCheck.message && !employeeIdCheck.error ? (
                    <CheckCircle2 className="h-5 w-5 text-green-700" />
                  ) : null
                }
              />
            )}
          />

          {/* Employee ID Check Status */}
          {!errors.employeeId && employeeIdCheck.message && (
            <p
              className={`text-sm flex items-center ${
                employeeIdCheck.exists || employeeIdCheck.error
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {employeeIdCheck.isChecking ? <Search className="mr-1 h-4 w-4" /> : employeeIdCheck.exists || employeeIdCheck.error ? <CircleAlert className="mr-1 h-4 w-4" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {employeeIdCheck.isChecking
                ? "กำลังตรวจสอบ..."
                : employeeIdCheck.message}
            </p>
          )}

          {/* Password Preview */}
          {employeeId && employeeId.length >= 6 && !employeeIdCheck.exists && (
            <p className="text-sm text-green-600 flex items-center">
              <LockKeyhole className="mr-1 h-4 w-4" />
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
          icon={<KeyRound className="h-4 w-4 text-pea-700" />}
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
                icon={
                  employeeId && employeeId.length >= 6 ? (
                    <LockKeyhole className="h-5 w-5 text-green-700" />
                  ) : undefined
                }
              />
            )}
          />
          <p className="text-xs text-gray-500">
            รหัสผ่านจะถูกตั้งให้เหมือนกับรหัสพนักงานโดยอัตโนมัติ
            ผู้ใช้สามารถเปลี่ยนได้ภายหลัง
          </p>
        </FormField>

        {/* Full Name Field */}
        <FormField
          label="ชื่อ-นามสกุล"
          name="fullName"
          error={errors.fullName}
          required
          icon={<UserRound className="h-4 w-4 text-pea-700" />}
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
          icon={<Building2 className="h-4 w-4 text-pea-700" />}
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
          icon={<GitBranch className="h-4 w-4 text-pea-700" />}
        >
          <Controller
            name="branchId"
            control={control}
            render={({ field }) => (
              <FormSelect
                {...field}
                options={branchOptions}
                placeholder={
                  !selectedWorkCenter ? "กรุณาเลือกจุดรวมงานก่อน" : "เลือกสาขา"
                }
                error={errors.branchId}
                disabled={!selectedWorkCenter}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
          {branchesLoading && selectedWorkCenter && (
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
          icon={<ShieldCheck className="h-4 w-4 text-pea-700" />}
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
            isLoading={
              createUserMutation.isPending || employeeIdCheck.isChecking
            }
            disabled={!isValid || employeeIdCheck.exists}
            className="w-full"
            icon={
              employeeIdCheck.isChecking
                ? undefined
                : employeeIdCheck.exists
                  ? <CircleAlert className="h-4 w-4" />
                  : createUserMutation.isPending
                    ? undefined
                    : <CheckCircle2 className="h-4 w-4" />
            }
          >
            {employeeIdCheck.exists
              ? "รหัสพนักงานซ้ำ - ไม่สามารถสร้างได้"
              : "สร้างผู้ใช้"}
          </FormButton>
        </div>

        {/* Info Panel */}
        <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <h4 className="mb-2 flex items-center gap-2 font-semibold text-sky-900"><Info className="h-4 w-4" />ข้อมูลสำคัญ</h4>
          <ul className="space-y-1 text-sm text-sky-900">
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
