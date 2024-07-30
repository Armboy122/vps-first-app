import {
  getPowerOutageRequestsSummary,
  getOMSStatusSummary,
  getLatestRequests,
  getRequestsByWorkCenter,
  getAverageApprovalTime,
  getPendingApprovals
} from "@/app/api/action/dashboard";

export async function DashboardData() {
  const summary = await getPowerOutageRequestsSummary();
  const omsStatus = await getOMSStatusSummary();
  const latestRequests = await getLatestRequests(5);
  const requestsByWorkCenter = await getRequestsByWorkCenter();
  const averageApprovalTime = await getAverageApprovalTime();
  const pendingApprovals = await getPendingApprovals();

  return {
    summary,
    omsStatus,
    latestRequests,
    requestsByWorkCenter,
    averageApprovalTime,
    pendingApprovals
  };
}