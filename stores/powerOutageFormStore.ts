/**
 * powerOutageFormStore — Zustand global store สำหรับ PowerOutage create flow
 *
 * ความรับผิดชอบที่ชัดเจน:
 *
 * RHF (React Hook Form) เป็นเจ้าของ:
 *   - ค่าของ field ปัจจุบันในฟอร์ม (outageDate, startTime, endTime, transformerNumber ฯลฯ)
 *   - validation state ระดับ field (errors จาก zodResolver)
 *   - dirty/touched/isSubmitting state ของฟอร์ม
 *
 * Zustand store นี้เป็นเจ้าของ:
 *   - รายการคำขอที่ stage ไว้รอ submit เป็น batch (requests[])
 *   - สถานะ error modal (errorModal)
 *   - สถานะ submission โดยรวม (submitStatus — loading, success, error message)
 *   - timeError ที่เกิดจาก cross-field validation (ไม่ใช่ RHF field error)
 *   - branches/transformers ที่ fetch มาจาก API (cached ใน store เพื่อ share ระหว่าง component)
 */

import { create } from "zustand";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import { FORM_MESSAGES } from "@/app/power-outage-requests/create/constants/form.constants";

interface Branch {
  id: number;
  shortName: string;
  workCenterId: number;
}

interface Transformer {
  transformerNumber: string;
  gisDetails: string;
}

const areTransformersEqual = (
  current: Transformer[],
  next: Transformer[],
) =>
  current.length === next.length &&
  current.every(
    (transformer, index) =>
      transformer.transformerNumber === next[index]?.transformerNumber &&
      transformer.gisDetails === next[index]?.gisDetails,
  );

interface SubmitStatus {
  success: boolean;
  message: string;
  isLoading?: boolean;
}

interface ValidationError {
  index: number;
  error: string;
  data?: any;
}

interface ErrorModalState {
  opened: boolean;
  title?: string;
  message?: string;
  type?: "error" | "warning" | "success" | "info";
  validationErrors?: ValidationError[];
  showDetails?: boolean;
}

interface PowerOutageFormState {
  // --- Zustand-owned: staged request list ---
  requests: PowerOutageRequestInput[];

  // --- Zustand-owned: submission status (loading / success / error message) ---
  submitStatus: SubmitStatus | null;

  // --- Zustand-owned: cross-field time error (not a RHF field error) ---
  timeError: string | null;

  // --- Zustand-owned: error modal UI state ---
  errorModal: ErrorModalState;

  // --- Zustand-owned: fetched lookup data (shared across components) ---
  branches: Branch[];
  transformers: Transformer[];

  // Actions สำหรับจัดการ state
  setBranches: (branches: Branch[]) => void;
  setTransformers: (transformers: Transformer[]) => void;
  setSubmitStatus: (status: SubmitStatus | null) => void;
  setTimeError: (error: string | null) => void;
  
  // Actions สำหรับจัดการ modal
  showErrorModal: (modalState: Partial<ErrorModalState>) => void;
  hideErrorModal: () => void;

  // Actions สำหรับจัดการคำขอ
  addRequest: (request: PowerOutageRequestInput) => void;
  removeRequest: (index: number) => void;
  clearAllRequests: () => void;

  // รีเซ็ต state ทั้งหมด
  reset: () => void;
}

const initialState = {
  branches: [],
  transformers: [],
  requests: [],
  submitStatus: null,
  timeError: null,
  errorModal: {
    opened: false,
    title: undefined,
    message: undefined,
    type: "error" as const,
    validationErrors: [],
    showDetails: false,
  },
};

export const usePowerOutageFormStore = create<PowerOutageFormState>(
  (set, get) => ({
    ...initialState,

    // การตั้งค่าข้อมูลพื้นฐาน
    setBranches: (branches) => set({ branches }),
    setTransformers: (transformers) =>
      set((state) =>
        areTransformersEqual(state.transformers, transformers)
          ? state
          : { transformers },
      ),
    setSubmitStatus: (submitStatus) => set({ submitStatus }),
    setTimeError: (timeError) => set({ timeError }),
    
    // การจัดการ modal
    showErrorModal: (modalState) => 
      set((state) => ({
        errorModal: {
          ...state.errorModal,
          ...modalState,
          opened: true,
        },
      })),
    hideErrorModal: () => 
      set((state) => ({
        errorModal: {
          ...state.errorModal,
          opened: false,
        },
      })),

    // การจัดการคำขอ
    addRequest: (request) => {
      const { requests } = get();
      const newRequests = [...requests, request];

      // Sort by outageDate first, then by startTime
      newRequests.sort((a, b) => {
        // เปรียบเทียบวันที่ก่อน
        const dateA = new Date(a.outageDate);
        const dateB = new Date(b.outageDate);

        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }

        // ถ้าวันที่เหมือนกัน ให้เปรียบเทียบเวลาเริ่มต้น
        const timeA = a.startTime || "00:00";
        const timeB = b.startTime || "00:00";

        return timeA.localeCompare(timeB);
      });

      set({
        requests: newRequests,
        submitStatus: {
          success: true,
          message: FORM_MESSAGES.SUCCESS.ADDED_TO_LIST,
        },
      });
    },

    removeRequest: (index) => {
      const { requests } = get();
      set({
        requests: requests.filter((_, i) => i !== index),
        submitStatus: {
          success: true,
          message: FORM_MESSAGES.SUCCESS.REMOVED_FROM_LIST,
        },
      });
    },

    clearAllRequests: () => {
      set({
        requests: [],
        submitStatus: {
          success: true,
          message: FORM_MESSAGES.SUCCESS.CLEARED_ALL,
        },
      });
    },

    // รีเซ็ตกลับสู่สถานะเริ่มต้น
    reset: () => set(initialState),
  }),
);
