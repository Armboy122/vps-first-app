"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

// Types และ Validations
import {
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
} from "@/lib/validations/powerOutageRequest";

// Components
import { FormButton } from "@/components/forms";
import { FormFields } from "./PowerOutageRequestForm/FormFields";
import { RequestList } from "./PowerOutageRequestForm/RequestList";
import { StatusMessages } from "./PowerOutageRequestForm/StatusMessages";

// Hooks และ State Management
import { usePowerOutageFormLogic } from "@/hooks/usePowerOutageFormLogic";
import { usePowerOutageFormStore } from "@/stores/powerOutageFormStore";
import { useWorkCenters } from "@/hooks/queries/useWorkCenters";
import { useBranches } from "@/hooks/queries/useBranches";
import { useTransformers } from "@/hooks/queries/useTransformers";
import { useLogger } from "@/hooks/useLogger";
import { logUserAction, logFormInteraction } from "@/lib/utils/logger";

// Utils
import { getMinSelectableDate, getDaysFromToday } from "@/lib/utils/dateUtils";

interface WorkCenter {
  id: number;
  name: string;
}

interface PowerOutageRequestFormProps {
  workCenters?: WorkCenter[];
  role: string;
  workCenterId?: string;
  branch?: string;
}

/**
 * ฟอร์มสำหรับสร้างคำขอดับไฟ
 * รองรับการบันทึกเดี่ยวและแบบรวมหลายรายการ
 */
export default function PowerOutageRequestForm({
  workCenters: initialWorkCenters,
  role,
  workCenterId,
  branch,
}: PowerOutageRequestFormProps) {
  const router = useRouter();
  
  // Setup logging
  useLogger();
  
  // Log form initialization
  React.useEffect(() => {
    logFormInteraction('power_outage_form_opened', {
      role,
      workCenterId,
      branch,
      hasInitialWorkCenters: !!initialWorkCenters?.length
    });
  }, [role, workCenterId, branch, initialWorkCenters]);
  
  // =============================================
  // State Management (Zustand Store)
  // =============================================
  const {
    requests,
    submitStatus,
    timeError,
    setTimeError,
    addRequest,
    removeRequest,
    clearAllRequests,
    reset: resetStore,
  } = usePowerOutageFormStore();

  // =============================================
  // Local State
  // =============================================
  const [transformerSearchTerm, setTransformerSearchTerm] = useState("");

  // =============================================
  // Form Setup
  // =============================================
  const form = useForm<PowerOutageRequestInput>({
    resolver: zodResolver(PowerOutageRequestSchema),
    defaultValues: {
      workCenterId: workCenterId,
      branchId: branch,
    },
  });

  const { register, handleSubmit, control, formState: { errors }, setValue, reset, watch } = form;

  // =============================================
  // Watch Values
  // =============================================
  const watchWorkCenterId = watch("workCenterId");
  const watchedOutageDate = watch("outageDate");

  // =============================================
  // Data Fetching (React Query)
  // =============================================
  const { data: workCenters = initialWorkCenters || [] } = useWorkCenters();
  const { data: branches = [], isLoading: branchesLoading } = useBranches(
    watchWorkCenterId ? Number(watchWorkCenterId) : null
  );
  const { data: transformers = [] } = useTransformers(transformerSearchTerm);

  // =============================================
  // Calculated Values
  // =============================================
  const minSelectableDate = getMinSelectableDate();
  const daysFromToday = getDaysFromToday(watchedOutageDate);
  const isDateValid = daysFromToday !== null && daysFromToday > 10;

  // =============================================
  // Custom Logic Hook
  // =============================================
  const {
    handleDateChange,
    handleTransformerSelect,
    onSubmit,
    onAddToList,
    handleSubmitAll,
  } = usePowerOutageFormLogic({
    form,
    minSelectableDate,
    setTimeError,
    addRequest,
    resetStore,
    router,
    requests,
  });

  // =============================================
  // Event Handlers
  // =============================================
  const handleTransformerSearch = (searchTerm: string) => {
    if (searchTerm.length >= 2) {
      logFormInteraction('transformer_search_performed', {
        searchTerm,
        searchLength: searchTerm.length
      });
    }
    setTransformerSearchTerm(searchTerm);
  };

  const onTransformerSelect = (transformer: any) => {
    logUserAction('transformer_selected_from_form', {
      transformerNumber: transformer.transformerNumber,
      gisDetails: transformer.gisDetails
    });
    handleTransformerSelect(transformer);
    setTransformerSearchTerm(""); // Clear search after selection
  };

  // =============================================
  // Loading State
  // =============================================
  if (branchesLoading && watchWorkCenterId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  // =============================================
  // Render
  // =============================================
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="space-y-6">
        {/* ฟอร์มหลัก */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* ฟิลด์ต่างๆ ในฟอร์ม */}
          <FormFields
            register={register}
            control={control}
            errors={errors}
            role={role}
            workCenters={workCenters}
            branches={branches}
            transformers={transformers}
            watchWorkCenterId={watchWorkCenterId}
            minSelectableDate={minSelectableDate}
            watchedOutageDate={watchedOutageDate}
            daysFromToday={daysFromToday}
            timeError={timeError}
            onDateChange={handleDateChange}
            onTransformerSearch={handleTransformerSearch}
            onTransformerSelect={onTransformerSelect}
          />

          {/* ปุ่มสำหรับการดำเนินการ */}
          <div className="flex justify-end space-x-4 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={handleSubmit(onAddToList)}
              disabled={!isDateValid}
              icon="➕"
            >
              เพิ่มเข้ารายการ
            </FormButton>
            
            <FormButton
              type="submit"
              variant="primary"
              disabled={!isDateValid}
              icon="💾"
            >
              บันทึกคำขอนี้
            </FormButton>
          </div>
        </form>

        {/* ข้อความสถานะและคำเตือน */}
        <StatusMessages
          timeError={timeError}
          submitStatus={submitStatus}
          daysFromToday={daysFromToday}
          watchedOutageDate={watchedOutageDate}
          minSelectableDate={minSelectableDate}
        />

        {/* รายการคำขอที่รอการบันทึก */}
        <RequestList
          requests={requests}
          submitStatus={submitStatus}
          onRemoveFromList={removeRequest}
          onClearAllRequests={clearAllRequests}
          onSubmitAll={handleSubmitAll}
        />
      </div>
    </LocalizationProvider>
  );
}