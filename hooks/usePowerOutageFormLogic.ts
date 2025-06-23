import { useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { useRouter } from "next/navigation";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import {
  createPowerOutageRequest,
  createMultiplePowerOutageRequests,
} from "@/app/api/action/powerOutageRequest";
import { validateDateAndTime } from "@/lib/utils/dateUtils";
import { usePowerOutageFormStore } from "@/stores/powerOutageFormStore";
import {
  logUserAction,
  logFormInteraction,
  logError,
} from "@/lib/utils/logger";

interface UsePowerOutageFormLogicProps {
  form: UseFormReturn<PowerOutageRequestInput>;
  minSelectableDate: string;
  setTimeError: (error: string | null) => void;
  addRequest: (request: PowerOutageRequestInput) => void;
  resetStore: () => void;
  router: ReturnType<typeof useRouter>;
  requests: PowerOutageRequestInput[];
}

/**
 * Custom hook ที่จัดการ business logic สำหรับ PowerOutageRequestForm
 * แยกออกจาก component เพื่อให้อ่านและดูแลง่ายขึ้น
 */
export const usePowerOutageFormLogic = ({
  form,
  minSelectableDate,
  setTimeError,
  addRequest,
  resetStore,
  router,
  requests,
}: UsePowerOutageFormLogicProps) => {
  const { setValue, reset } = form;
  const { setSubmitStatus, showErrorModal } = usePowerOutageFormStore();

  /**
   * จัดการการเปลี่ยนแปลงวันที่
   */
  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedDate = event.target.value;
      const validation = validateDateAndTime(selectedDate, minSelectableDate);

      logFormInteraction("outage_date_changed", {
        selectedDate,
        isValid: validation.isValid,
        error: validation.error,
      });

      if (!validation.isValid) {
        setTimeError(validation.error || "");
      } else {
        setTimeError(null);
      }

      setValue("outageDate", selectedDate);
    },
    [setValue, minSelectableDate, setTimeError],
  );

  /**
   * จัดการการเลือกหม้อแปลงจากรายการค้นหา
   */
  const handleTransformerSelect = useCallback(
    (transformer: any) => {
      logFormInteraction("transformer_selected", {
        transformerNumber: transformer.transformerNumber,
        gisDetails: transformer.gisDetails,
      });

      setValue("transformerNumber", transformer.transformerNumber);
      setValue("gisDetails", transformer.gisDetails);
    },
    [setValue],
  );

  /**
   * ส่งคำขอเดี่ยว
   */
  const onSubmit = useCallback(
    async (data: PowerOutageRequestInput) => {
      const validation = validateDateAndTime(
        data.outageDate,
        minSelectableDate,
        data.startTime,
        data.endTime,
      );

      logFormInteraction("power_outage_request_submit_attempted", {
        isValid: validation.isValid,
        transformerNumber: data.transformerNumber,
        outageDate: data.outageDate,
        workCenterId: data.workCenterId,
        branchId: data.branchId,
      });

      if (!validation.isValid) {
        setTimeError(validation.error || "");
        showErrorModal({
          type: "error",
          title: "ข้อมูลไม่ถูกต้อง",
          message: validation.error || "กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง",
        });
        logError(
          "power_outage_request_validation_failed",
          validation.error || "Validation failed",
          { data },
        );
        return;
      }

      try {
        const result = await createPowerOutageRequest(data);
        if (result.success) {
          logUserAction("power_outage_request_created", {
            transformerNumber: data.transformerNumber,
            outageDate: data.outageDate,
            success: true,
          });

          setSubmitStatus({
            success: true,
            message: "คำขอถูกบันทึกเรียบร้อยแล้ว",
          });
          reset();
          router.push("/power-outage-requests");
        } else {
          logError(
            "power_outage_request_create_failed",
            result.error || "Unknown error",
            { data },
          );
          showErrorModal({
            type: "error",
            title: "ไม่สามารถบันทึกคำขอได้",
            message: result.error || "เกิดข้อผิดพลาดในการบันทึกคำขอ กรุณาลองใหม่อีกครั้ง",
          });
        }
      } catch (error) {
        logError("power_outage_request_create_error", error as Error, { data });
        showErrorModal({
          type: "error",
          title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
          message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง",
        });
      }
    },
    [minSelectableDate, setTimeError, setSubmitStatus, reset, router],
  );

  /**
   * เพิ่มคำขอเข้ารายการรอ
   */
  const onAddToList = useCallback(
    (data: PowerOutageRequestInput) => {
      const validation = validateDateAndTime(
        data.outageDate,
        minSelectableDate,
        data.startTime,
        data.endTime,
      );

      logFormInteraction("power_outage_request_add_to_list_attempted", {
        isValid: validation.isValid,
        transformerNumber: data.transformerNumber,
        outageDate: data.outageDate,
      });

      if (!validation.isValid) {
        setTimeError(validation.error || "");
        logError(
          "power_outage_request_add_validation_failed",
          validation.error || "Validation failed",
          { data },
        );
        return;
      }

      logUserAction("power_outage_request_added_to_list", {
        transformerNumber: data.transformerNumber,
        outageDate: data.outageDate,
        currentListLength: requests.length,
      });

      addRequest(data);
      reset();
    },
    [minSelectableDate, setTimeError, addRequest, reset, requests.length],
  );

  /**
   * ส่งคำขอทั้งหมดพร้อมกัน
   */
  const handleSubmitAll = useCallback(async () => {
    if (requests.length === 0) {
      logError("bulk_submit_attempted_empty_list", "No requests in list");
      setSubmitStatus({
        success: false,
        message: "ไม่มีคำขอในรายการ",
      });
      return;
    }

    logUserAction("bulk_power_outage_requests_submit_started", {
      requestCount: requests.length,
      transformers: requests.map((r) => r.transformerNumber),
    });

    try {
      setSubmitStatus({
        success: true,
        message: `กำลังบันทึกคำขอ ${requests.length} รายการ...`,
        isLoading: true,
      });

      const result = await createMultiplePowerOutageRequests(requests);

      if (result.success) {
        logUserAction("bulk_power_outage_requests_created", {
          requestCount: requests.length,
          successCount: result.successCount,
          success: true,
        });

        // รีเซ็ตฟอร์มและรายการคำขอ
        reset();
        resetStore();

        setSubmitStatus({
          success: true,
          message:
            result.message ||
            `บันทึกคำขอสำเร็จทั้งหมด ${result.successCount} รายการ`,
        });

        setTimeout(() => router.back(), 1500);
      } else {
        logError("bulk_power_outage_requests_failed", result.error || "Unknown error", {
          requestCount: requests.length,
          validationErrors: result.validationErrors,
        });

        showErrorModal({
          type: "error",
          title: "ไม่สามารถบันทึกคำขอได้",
          message: result.error || "เกิดข้อผิดพลาดในการบันทึกคำขอหลายรายการ",
          validationErrors: result.validationErrors || [],
          showDetails: !!result.validationErrors?.length,
        });
      }
    } catch (error) {
      logError("bulk_power_outage_requests_error", error as Error, {
        requestCount: requests.length,
      });

      setSubmitStatus({
        success: false,
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์",
      });
    }
  }, [requests, setSubmitStatus, resetStore, reset, router]);

  return {
    handleDateChange,
    handleTransformerSelect,
    onSubmit,
    onAddToList,
    handleSubmitAll,
  };
};
