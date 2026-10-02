"use server";

import type { OMSStatus, Request } from "@prisma/client";
import type { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";
import * as useCases from "@/lib/modules/outages/application/useCases";

export async function validateOutageDatesForImport(dates: string[]) { return useCases.validateOutageDatesForImport(dates); }
export async function createPowerOutageRequest(data: PowerOutageRequestInput) { return useCases.createPowerOutageRequest(data); }
export async function createMultiplePowerOutageRequests(data: PowerOutageRequestInput[], idempotencyKey: string) { return useCases.createMultiplePowerOutageRequests(data, idempotencyKey); }
export async function searchTransformers(searchTerm: string) { return useCases.searchTransformers(searchTerm); }
export async function getTransformerByNumber(number: string) { return useCases.getTransformerByNumber(number); }
export async function getTransformersByNumbers(numbers: string[]) { return useCases.getTransformersByNumbers(numbers); }
export async function getPowerOutageRequests(page = 1, limit = 50, filters?: Parameters<typeof useCases.getPowerOutageRequests>[2]) { return useCases.getPowerOutageRequests(page, limit, filters); }
export async function deletePowerOutageRequest(id: number) { return useCases.deletePowerOutageRequest(id); }
export async function updatePowerOutageRequest(id: number, data: PowerOutageRequestInput) { return useCases.updatePowerOutageRequest(id, data); }
export async function updateOMS(id: number, status: OMSStatus) { return useCases.updateOMS(id, status); }
export async function updateStatusRequest(id: number, status: Request) { return useCases.updateStatusRequest(id, status); }
