"use client";

/**
 * @deprecated
 * This file is kept for backward compatibility.
 *
 * Responsibility split:
 * - RHF (React Hook Form): owns current form field values, field-level validation state
 * - Zustand (powerOutageFormStore): owns staged requests list, error modal state, submission status
 *
 * The active implementation lives in:
 *   app/power-outage-requests/create/hooks/usePowerOutageFormLogic.ts
 *
 * That hook handles all business logic (submit, add-to-list, date validation, transformer selection).
 * PowerOutageCreatePage.tsx sets up RHF and delegates to usePowerOutageFormLogic.
 *
 * If you need the combined "old-style" hook that also manages fetch state, use the
 * individual hooks in PowerOutageCreatePage.tsx instead:
 *   - useWorkCenters, useBranches, useTransformers  (fetch)
 *   - usePowerOutageFormStore                       (global state)
 *   - usePowerOutageFormLogic                       (business logic)
 */
export { usePowerOutageFormLogic as usePowerOutageForm } from "@/app/power-outage-requests/create/hooks/usePowerOutageFormLogic";
