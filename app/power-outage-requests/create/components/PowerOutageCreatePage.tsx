"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

// Types และ Validations
import {
  BusinessDayCalendarConfig,
  getBusinessDaysUntilOutage,
  getCalendarDaysUntilOutage,
  getMinOutageBusinessDateString,
  MIN_OUTAGE_BUSINESS_DAYS,
  MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE,
  PowerOutageRequestSchema,
  PowerOutageRequestInput,
  validateOutageBusinessDate,
} from "@/lib/validations/powerOutageRequest";
import { getActiveBusinessCalendarDateMetadata } from "@/app/api/action/businessCalendar";

// Components
import { FormButton } from "@/components/forms";
import { ImprovedFormFields } from "./forms";
import { StatusMessages } from "./shared";
import { RequestList } from "./request-list";
import { CSVImport } from "./csv-import";
import { ErrorModal } from "@/components/modals/ErrorModal";
import { CalendarDays, MapPin, ClipboardCheck, ChevronRight, ChevronLeft, Check } from "lucide-react";

// Hooks และ State Management
import { usePowerOutageFormLogic } from "../hooks";
import { usePowerOutageFormStore } from "@/stores/powerOutageFormStore";
import { useWorkCenters } from "@/hooks/queries/useWorkCenters";
import { useTransformers } from "@/hooks/queries/useTransformers";
import { useLogger } from "@/hooks/useLogger";
import { logUserAction, logFormInteraction } from "@/lib/utils/logger";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [holidayDateKeys, setHolidayDateKeys] = useState<string[]>([]);
  const [specialWorkdayDateKeys, setSpecialWorkdayDateKeys] = useState<string[]>([]);

  const calendarConfig = React.useMemo<BusinessDayCalendarConfig>(
    () => ({ holidayDateKeys, specialWorkdayDateKeys }),
    [holidayDateKeys, specialWorkdayDateKeys],
  );

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

  useEffect(() => {
    let active = true;
    const currentYear = new Date().getFullYear();

    getActiveBusinessCalendarDateMetadata(
      `${currentYear}-01-01`,
      `${currentYear + 1}-12-31`,
    )
      .then((entries) => {
        if (!active) return;

        setHolidayDateKeys(
          entries
            .filter((entry) => entry.type === "HOLIDAY")
            .map((entry) => entry.dateKey),
        );
        setSpecialWorkdayDateKeys(
          entries
            .filter((entry) => entry.type === "SPECIAL_WORKDAY")
            .map((entry) => entry.dateKey),
        );
      })
      .catch((error) => {
        console.error("Failed to load business calendar dates:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  // =============================================
  // Calculated Values
  // =============================================
  const minSelectableDate = getMinOutageBusinessDateString(
    new Date(),
    calendarConfig,
  );
  const dateValidation = validateOutageBusinessDate(
    watchedOutageDate,
    new Date(),
    calendarConfig,
  );
  const daysFromToday =
    watchedOutageDate
      ? getBusinessDaysUntilOutage(watchedOutageDate, new Date(), calendarConfig)
      : null;
  const calendarDaysFromToday =
    watchedOutageDate
      ? getCalendarDaysUntilOutage(watchedOutageDate, new Date())
      : null;
  const isDateValid =
    !!watchedOutageDate &&
    dateValidation.isValid &&
    daysFromToday !== null &&
    daysFromToday >= MIN_OUTAGE_BUSINESS_DAYS &&
    calendarDaysFromToday !== null &&
    calendarDaysFromToday > MIN_OUTAGE_CALENDAR_DAYS_EXCLUSIVE;

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
    calendarConfig,
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
  // Stepper helpers
  // =============================================
  const STEPS = [
    { num: 1, label: "วันที่และเวลา", icon: CalendarDays },
    { num: 2, label: "สถานที่และหม้อแปลง", icon: MapPin },
    { num: 3, label: "ตรวจทานและยืนยัน", icon: ClipboardCheck },
  ];

  const watchedStartTime = watch("startTime");
  const watchedEndTime = watch("endTime");
  const watchedTransformerNumber = watch("transformerNumber");
  const watchedGisDetails = watch("gisDetails");
  const watchedArea = watch("area");

  const isStepOneTimeValid = (() => {
    if (!watchedStartTime || !watchedEndTime) return false;
    const [startHour, startMin] = watchedStartTime.split(":").map(Number);
    const [endHour, endMin] = watchedEndTime.split(":").map(Number);
    if ([startHour, startMin, endHour, endMin].some(Number.isNaN)) return false;

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (
      startMinutes >= 6 * 60 &&
      startMinutes <= 19 * 60 + 30 &&
      endMinutes >= 6 * 60 + 30 &&
      endMinutes <= 20 * 60 &&
      endMinutes >= startMinutes + 30
    );
  })();
  const canGoToStep2 = isDateValid && isStepOneTimeValid;
  const canGoToStep3 = canGoToStep2 && !!watchedTransformerNumber;

  const handleSetValue = (name: keyof import("@/lib/validations/powerOutageRequest").PowerOutageRequestInput, value: string) => {
    setValue(name, value);
  };

  // Wrapper: add to list → keep date + org → clear time + location → back to step 1
  const handleAddToListAndContinue = (data: PowerOutageRequestInput) => {
    const savedDate = data.outageDate;
    const savedWorkCenterId = data.workCenterId;
    const savedBranchId = data.branchId;

    // This validates + adds + resets the form
    onAddToList(data);

    // Restore only date + org. Time + location are cleared so user picks fresh.
    // Jumps to step 1 where quick presets make time selection fast.
    setTimeout(() => {
      setValue("outageDate", savedDate);
      setValue("workCenterId", savedWorkCenterId);
      setValue("branchId", savedBranchId);
      setCurrentStep(1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2500);
    }, 50);
  };

  const formatReviewDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  // =============================================
  // Render
  // =============================================
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="space-y-6">
        {/* Step Indicator Bar */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.num;
                const isCompleted = currentStep > step.num;
                return (
                  <React.Fragment key={step.num}>
                    <button
                      type="button"
                      onClick={() => {
                        if (step.num < currentStep) setCurrentStep(step.num);
                        if (step.num === 2 && canGoToStep2) setCurrentStep(2);
                        if (step.num === 3 && canGoToStep3) setCurrentStep(3);
                      }}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all cursor-pointer ${
                        isActive
                          ? "bg-blue-50 ring-2 ring-blue-200"
                          : isCompleted
                            ? "bg-emerald-50 hover:bg-emerald-100"
                            : "bg-slate-50 opacity-60"
                      }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : isCompleted
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                      </div>
                      <div className="hidden sm:block text-left">
                        <p className={`text-xs font-semibold uppercase tracking-wider ${
                          isActive ? "text-blue-700" : isCompleted ? "text-emerald-700" : "text-slate-500"
                        }`}>Step {step.num}</p>
                        <p className={`text-sm font-medium ${
                          isActive ? "text-blue-900" : isCompleted ? "text-emerald-900" : "text-slate-600"
                        }`}>{step.label}</p>
                      </div>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <div className={`hidden sm:block flex-1 h-px mx-3 ${
                        currentStep > step.num ? "bg-emerald-300" : "bg-slate-200"
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* ข้อความสถานะและคำเตือน */}
        <StatusMessages
          timeError={timeError}
          submitStatus={submitStatus}
          daysFromToday={daysFromToday}
          calendarDaysFromToday={calendarDaysFromToday}
          watchedOutageDate={watchedOutageDate}
          minSelectableDate={minSelectableDate}
        />

        {/* แจ้งเตือนเพิ่มสำเร็จ */}
        {justAdded && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 animate-in">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-[15px] font-medium text-emerald-800">
              เพิ่มแล้ว! มี <strong>{requests.length}</strong> รายการในคิว — เลือกหม้อแปลงถัดไปได้เลย
            </p>
          </div>
        )}

        {/* Queue indicator when in step 2 with items */}
        {currentStep === 2 && requests.length > 0 && !justAdded && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-sm font-bold text-blue-700">
              {requests.length}
            </div>
            <p className="text-sm text-blue-800">
              มี <strong>{requests.length}</strong> รายการในคิวรอบันทึก — เลือกหม้อแปลงเพิ่มได้เลย
            </p>
          </div>
        )}

        {/* ฟอร์มหลัก (Steps 1 & 2) */}
        {currentStep <= 2 && (
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
              currentStep={currentStep}
              onSetValue={handleSetValue}
              holidayDateKeys={holidayDateKeys}
              specialWorkdayDateKeys={specialWorkdayDateKeys}
              minSelectableDate={minSelectableDate}
              daysFromToday={daysFromToday}
              calendarDaysFromToday={calendarDaysFromToday}
            />

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-200">
              <div>
                {currentStep > 1 && (
                  <FormButton
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    <span className="inline-flex items-center gap-1.5"><ChevronLeft className="w-4 h-4" /> ย้อนกลับ</span>
                  </FormButton>
                )}
              </div>
              <div>
                {currentStep === 1 && (
                  <FormButton
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={!canGoToStep2}
                    onClick={() => setCurrentStep(2)}
                  >
                    <span className="inline-flex items-center gap-1.5">ถัดไป: สถานที่ <ChevronRight className="w-4 h-4" /></span>
                  </FormButton>
                )}
                {currentStep === 2 && (
                  <div className="flex gap-2">
                    {requests.length > 0 && (
                      <FormButton
                        type="button"
                        variant="secondary"
                        size="lg"
                        disabled={!canGoToStep3}
                        onClick={handleSubmit(handleAddToListAndContinue)}
                      >
                        + เพิ่มแล้วกรอกต่อ
                      </FormButton>
                    )}
                    <FormButton
                      type="button"
                      variant="primary"
                      size="lg"
                      disabled={!canGoToStep3}
                      onClick={() => setCurrentStep(3)}
                    >
                      <span className="inline-flex items-center gap-1.5">ถัดไป: ตรวจทาน <ChevronRight className="w-4 h-4" /></span>
                    </FormButton>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
        )}

        {/* Step 3: Review & Submit */}
        {currentStep === 3 && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
          <div className="p-5 md:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">ตรวจทานข้อมูลก่อนยืนยัน</h2>
              <p className="text-sm text-slate-600 mt-0.5">ตรวจสอบข้อมูลให้ครบถ้วนก่อนบันทึก หากต้องการแก้ไขให้กดย้อนกลับ</p>
            </div>

            {/* Review Card */}
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {/* วันที่และเวลา */}
              <div className="p-4 flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">วันที่และเวลา</p>
                  <p className="text-base font-semibold text-slate-900 mt-0.5">{formatReviewDate(watchedOutageDate)}</p>
                  <p className="text-[15px] text-slate-700 mt-0.5">{watchedStartTime || "-"} – {watchedEndTime || "-"}</p>
                </div>
                <button type="button" onClick={() => setCurrentStep(1)} className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer">แก้ไข</button>
              </div>
              {/* สถานที่ */}
              <div className="p-4 flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">สถานที่และหม้อแปลง</p>
                  <p className="text-base font-semibold text-slate-900 mt-0.5">{watchedTransformerNumber || "-"}</p>
                  {watchedGisDetails && <p className="text-[15px] text-slate-700 mt-0.5">{watchedGisDetails}</p>}
                  {watchedArea && <p className="text-sm text-slate-600 mt-0.5">พื้นที่: {watchedArea}</p>}
                </div>
                <button type="button" onClick={() => setCurrentStep(2)} className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer">แก้ไข</button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <FormButton
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setCurrentStep(2)}
              >
                <span className="inline-flex items-center gap-1.5"><ChevronLeft className="w-4 h-4" /> ย้อนกลับ</span>
              </FormButton>
              <div className="flex gap-3">
                <FormButton
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleSubmit(handleAddToListAndContinue)}
                  disabled={!canGoToStep3}
                >
                  + เพิ่มแล้วกรอกต่อ
                </FormButton>
                <FormButton
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleSubmit(onSubmit)}
                  disabled={!canGoToStep3}
                >
                  บันทึกคำขอนี้
                </FormButton>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* นำเข้าข้อมูลจาก CSV */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
          <div className="p-5 md:p-6 space-y-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">นำเข้าจากไฟล์ CSV</h2>
            <p className="text-sm text-slate-600">อัปโหลดไฟล์ CSV เพื่อเพิ่มหลายรายการพร้อมกัน (ไม่ต้องผ่านขั้นตอนด้านบน)</p>
          </div>
          <div className="px-5 md:px-6 pb-5 md:pb-6">
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
