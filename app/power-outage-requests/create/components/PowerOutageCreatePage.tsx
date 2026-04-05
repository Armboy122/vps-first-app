"use client";
import React, { useState, useEffect } from "react";
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
import { ImprovedFormFields } from "./forms";
import { StatusMessages } from "./shared";
import { RequestList } from "./request-list";
import { CSVImport } from "./csv-import";
import { ErrorModal } from "@/components/modals/ErrorModal";

// Hooks และ State Management
import { usePowerOutageFormLogic } from "../hooks";
import { usePowerOutageFormStore } from "@/stores/powerOutageFormStore";
import { useWorkCenters } from "@/hooks/queries/useWorkCenters";
import { useTransformers } from "@/hooks/queries/useTransformers";
import { useLogger } from "@/hooks/useLogger";
import { logUserAction, logFormInteraction } from "@/lib/utils/logger";

// Utils
import { getMinSelectableDate, getDaysFromToday } from "@/lib/utils/dateUtils";

interface WorkCenter {
  id: number;
  name: string;
}

interface PowerOutageCreatePageProps {
  workCenters?: WorkCenter[];
  role: string;
  workCenterId?: string;
  branch?: string;
}

export default function PowerOutageCreatePage({
  workCenters: initialWorkCenters,
  role,
  workCenterId,
  branch,
}: PowerOutageCreatePageProps) {
  const router = useRouter();

  // Setup logging
  useLogger();

  // Log form initialization
  React.useEffect(() => {
    logFormInteraction("power_outage_form_opened", {
      role,
      workCenterId,
      branch,
      hasInitialWorkCenters: !!initialWorkCenters?.length,
    });
  }, [role, workCenterId, branch, initialWorkCenters]);

  // =============================================
  // State Management (Zustand Store)
  // =============================================
  const {
    requests,
    submitStatus,
    timeError,
    errorModal,
    setTimeError,
    setTransformers,
    addRequest,
    removeRequest,
    clearAllRequests,
    hideErrorModal,
    reset: resetStore,
  } = usePowerOutageFormStore();

  // =============================================
  // Local State
  // =============================================
  const [transformerSearchTerm, setTransformerSearchTerm] = useState("TR");

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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = form;

  // =============================================
  // Watch Values
  // Only values needed at this level are watched here.
  // ImprovedFormFields watches its own values via useWatch internally.
  // =============================================
  const watchWorkCenterId = watch("workCenterId"); // needed for branchId reset below
  const watchedOutageDate = watch("outageDate");   // needed for isDateValid gate

  // =============================================
  // Reset branchId when workCenterId changes
  // =============================================
  React.useEffect(() => {
    if (role === "ADMIN" && watchWorkCenterId) {
      setValue("branchId", ""); // Reset branch when work center changes
    }
  }, [watchWorkCenterId, setValue, role]);

  // =============================================
  // Data Fetching (React Query)
  // =============================================
  const { data: workCenters = initialWorkCenters || [] } = useWorkCenters();

  // Fetch transformers and sync into Zustand store so ImprovedFormFields can read them
  // without needing them passed as props.
  const { data: fetchedTransformers } = useTransformers(transformerSearchTerm);

  useEffect(() => {
    if (transformerSearchTerm.length < 2) {
      setTransformers([]);
      return;
    }

    if (fetchedTransformers) {
      setTransformers(fetchedTransformers);
    }
  }, [fetchedTransformers, setTransformers, transformerSearchTerm]);

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
      logFormInteraction("transformer_search_performed", {
        searchTerm,
        searchLength: searchTerm.length,
      });
    }
    setTransformerSearchTerm(searchTerm);
  };

  const onTransformerSelect = (transformer: any) => {
    logUserAction("transformer_selected_from_form", {
      transformerNumber: transformer.transformerNumber,
      gisDetails: transformer.gisDetails,
    });
    handleTransformerSelect(transformer);
    setTransformerSearchTerm(""); // Clear search after selection
  };

  // =============================================
  // Excel Import Handler
  // =============================================
  const handleImportData = (importedData: PowerOutageRequestInput[]) => {
    logUserAction("excel_data_imported", {
      count: importedData.length,
      hasExistingRequests: requests.length > 0,
    });

    // เพิ่มข้อมูลที่นำเข้าจาก Excel เข้าในรายการคำขอ
    importedData.forEach((data) => {
      addRequest(data);
    });
  };

  // =============================================
  // Render
  // =============================================
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="space-y-6">
        {/* ข้อความสถานะและคำเตือน */}
        <StatusMessages
          timeError={timeError}
          submitStatus={submitStatus}
          daysFromToday={daysFromToday}
          watchedOutageDate={watchedOutageDate}
          minSelectableDate={minSelectableDate}
        />

        {/* ฟอร์มหลัก */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)} className="p-5 md:p-6 space-y-6">
            <ImprovedFormFields
              register={register}
              control={control}
              errors={errors}
              role={role}
              workCenters={workCenters}
              onDateChange={handleDateChange}
              onTransformerSearch={handleTransformerSearch}
              onTransformerSelect={onTransformerSelect}
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
              <FormButton
                type="button"
                variant="secondary"
                onClick={handleSubmit(onAddToList)}
                disabled={!isDateValid}
              >
                เพิ่มเข้ารายการ
              </FormButton>

              <FormButton
                type="submit"
                variant="primary"
                disabled={!isDateValid}
              >
                บันทึกคำขอนี้
              </FormButton>
            </div>
          </form>
        </div>

        {/* นำเข้าข้อมูลจาก CSV */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
          <div className="p-5 md:p-6">
            <CSVImport
              role={role}
              workCenters={workCenters}
              onImportData={handleImportData}
              userWorkCenterId={workCenterId}
              userBranch={branch}
              existingRequests={requests}
              onClearExistingRequests={clearAllRequests}
            />
          </div>
        </div>

        {/* รายการคำขอที่รอการบันทึก */}
        <RequestList
          requests={requests}
          submitStatus={submitStatus}
          onRemoveFromList={removeRequest}
          onClearAllRequests={clearAllRequests}
          onSubmitAll={handleSubmitAll}
        />
        
        {/* Error Modal */}
        <ErrorModal
          opened={errorModal.opened}
          onClose={hideErrorModal}
          title={errorModal.title}
          message={errorModal.message}
          type={errorModal.type}
          validationErrors={errorModal.validationErrors}
          showDetails={errorModal.showDetails}
        />
      </div>
    </LocalizationProvider>
  );
}
