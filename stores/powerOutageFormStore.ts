import { create } from "zustand";
import { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";

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

interface PowerOutageFormState {
  // ข้อมูลพื้นฐาน
  branches: Branch[];
  transformers: Transformer[];
  requests: PowerOutageRequestInput[];
  submitStatus: SubmitStatus | null;
  timeError: string | null;

  // Actions สำหรับจัดการ state
  setBranches: (branches: Branch[]) => void;
  setTransformers: (transformers: Transformer[]) => void;
  setSubmitStatus: (status: SubmitStatus | null) => void;
  setTimeError: (error: string | null) => void;

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
};

export const usePowerOutageFormStore = create<PowerOutageFormState>(
  (set, get) => ({
    ...initialState,

    // การตั้งค่าข้อมูลพื้นฐาน
    setBranches: (branches) => set({ branches }),
    setTransformers: (transformers) => set({ transformers }),
    setSubmitStatus: (submitStatus) => set({ submitStatus }),
    setTimeError: (timeError) => set({ timeError }),

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
          message: "คำขอถูกเพิ่มเข้าสู่รายการแล้ว (เรียงตามวันที่และเวลา)",
        },
      });
    },

    removeRequest: (index) => {
      const { requests } = get();
      set({
        requests: requests.filter((_, i) => i !== index),
        submitStatus: {
          success: true,
          message: "ลบรายการออกจากรายการรอบันทึกแล้ว",
        },
      });
    },

    clearAllRequests: () => {
      set({
        requests: [],
        submitStatus: {
          success: true,
          message: "ล้างรายการทั้งหมดแล้ว",
        },
      });
    },

    // รีเซ็ตกลับสู่สถานะเริ่มต้น
    reset: () => set(initialState),
  }),
);
