"use client";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";
import {
  createPowerOutageRequest,
  createMultiplePowerOutageRequests,
  searchTransformers,
} from "@/app/api/action/powerOutageRequest";
import { getBranches } from "@/app/api/action/getWorkCentersAndBranches";
import { getMinSelectableDate, getDaysFromToday, validateDateAndTime } from "@/lib/utils/dateUtils";

interface Branch {
  id: number;
  shortName: string;
  workCenterId: number;
}

interface Transformer {
  transformerNumber: string;
  gisDetails: string;
}

interface SubmitStatus {
  success: boolean;
  message: string;
  isLoading?: boolean;
}

interface UsePowerOutageFormProps {
  role: string;
  workCenterId?: string;
  branch?: string;
}

export const usePowerOutageForm = ({ role, workCenterId, branch }: UsePowerOutageFormProps) => {
  const router = useRouter();
  
  // State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [requests, setRequests] = useState<PowerOutageRequestInput[]>([]);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Form setup
  const form = useForm<PowerOutageRequestInput>({
    resolver: zodResolver(PowerOutageRequestSchema),
    defaultValues: {
      workCenterId: workCenterId,
      branchId: branch,
    },
  });

  const { register, handleSubmit, control, formState: { errors }, setValue, reset, watch } = form;
  const watchWorkCenterId = watch("workCenterId");
  const watchedOutageDate = watch("outageDate");
  
  // Calculated values
  const minSelectableDate = getMinSelectableDate();
  const daysFromToday = getDaysFromToday(watchedOutageDate);
  const isDateValid = daysFromToday !== null && daysFromToday > 10;

  // Load branches when work center changes
  const loadBranches = useCallback(async (workCenterId: number) => {
    try {
      const branchData = await getBranches(workCenterId);
      setBranches(branchData);
    } catch (error) {
      console.error("Failed to load branches:", error);
    }
  }, []);

  // Handle transformer search
  const handleTransformerSearch = useCallback(async (searchTerm: string) => {
    if (searchTerm.length >= 2) {
      try {
        const results = await searchTransformers(searchTerm);
        setTransformers(results);
      } catch (error) {
        console.error("Failed to search transformers:", error);
        setTransformers([]);
      }
    } else {
      setTransformers([]);
    }
  }, []);

  // Select transformer from search results
  const handleTransformerSelect = useCallback((transformer: Transformer) => {
    setValue("transformerNumber", transformer.transformerNumber);
    setValue("gisDetails", transformer.gisDetails);
    setTransformers([]);
  }, [setValue]);

  // Handle date change with validation
  const handleDateChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = event.target.value;
    const validation = validateDateAndTime(selectedDate, minSelectableDate);
    
    if (!validation.isValid) {
      setTimeError(validation.error || "");
    } else {
      setTimeError(null);
    }
    
    setValue("outageDate", selectedDate);
  }, [setValue, minSelectableDate]);

  // Submit single request
  const onSubmit = useCallback(async (data: PowerOutageRequestInput) => {
    const validation = validateDateAndTime(data.outageDate, minSelectableDate, data.startTime, data.endTime);
    if (!validation.isValid) {
      setTimeError(validation.error || "");
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
  }, [reset, router, minSelectableDate]);

  // Add to batch list
  const onAddToList = useCallback((data: PowerOutageRequestInput) => {
    const validation = validateDateAndTime(data.outageDate, minSelectableDate, data.startTime, data.endTime);
    if (!validation.isValid) {
      setTimeError(validation.error || "");
      return;
    }

    setRequests((prev) => [...prev, data]);
    setSubmitStatus({
      success: true,
      message: "คำขอถูกเพิ่มเข้าสู่รายการแล้ว",
    });
    reset();
  }, [reset, minSelectableDate]);

  // Remove from batch list
  const removeFromList = useCallback((index: number) => {
    setRequests((prev) => prev.filter((_, i) => i !== index));
    setSubmitStatus({
      success: true,
      message: "ลบรายการออกจากรายการรอบันทึกแล้ว",
    });
  }, []);

  // Clear all requests
  const clearAllRequests = useCallback(() => {
    setRequests([]);
    setSubmitStatus({
      success: true,
      message: "ล้างรายการทั้งหมดแล้ว",
    });
  }, []);

  // Submit all requests in batch
  const handleSubmitAll = useCallback(async () => {
    if (requests.length === 0) {
      setSubmitStatus({
        success: false,
        message: "ไม่มีคำขอในรายการ",
      });
      return;
    }

    try {
      setSubmitStatus({
        success: true,
        message: `กำลังบันทึกคำขอ ${requests.length} รายการ...`,
        isLoading: true,
      });

      const result = await createMultiplePowerOutageRequests(requests);
      
      if (result.success) {
        setRequests([]);
        setSubmitStatus({
          success: true,
          message: result.message || `บันทึกคำขอสำเร็จทั้งหมด ${result.successCount} รายการ`,
        });
        reset();
        setTimeout(() => router.back(), 1500);
      } else {
        const errorMessage = result.validationErrors?.length 
          ? `พบข้อผิดพลาด ${result.validationErrors.length} รายการ:\n${result.validationErrors.map(err => `รายการที่ ${err.index}: ${err.error}`).join('\n')}`
          : result.error || "เกิดข้อผิดพลาดในการบันทึกคำขอ";
        
        setSubmitStatus({
          success: false,
          message: errorMessage,
        });
      }
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์",
      });
    }
  }, [requests, reset, router]);

  // Load initial data
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
  }, [role, workCenterId, branch, watchWorkCenterId, setValue, loadBranches]);

  return {
    // Form
    form: { register, handleSubmit, control, errors, setValue, reset, watch },
    
    // State
    branches,
    transformers,
    requests,
    submitStatus,
    timeError,
    
    // Calculated values
    minSelectableDate,
    daysFromToday,
    isDateValid,
    watchedOutageDate,
    
    // Actions
    handleTransformerSearch,
    handleTransformerSelect,
    handleDateChange,
    onSubmit,
    onAddToList,
    removeFromList,
    clearAllRequests,
    handleSubmitAll,
  };
};
