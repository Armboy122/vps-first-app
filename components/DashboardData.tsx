import {
  getPowerOutageRequestsSummary,
  getOMSStatusSummary,
  getRequestsByWorkCenter,
} from "@/app/api/action/dashboard";

export async function DashboardData() {
  const summary = await getPowerOutageRequestsSummary();
  const omsStatus = await getOMSStatusSummary();

  const requestsByWorkCenter = await getRequestsByWorkCenter();

  return {
    summary,
    omsStatus,

    requestsByWorkCenter,
  };
}
