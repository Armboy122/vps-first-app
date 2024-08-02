// app/page.tsx
import WorkCenterRequestsChart from '@/components/Dashbord/WorkCenterRequestsChart';
import RequestStatusPieChart from '@/components/Dashbord/RequestStatusPieChart';
import RequestsOverTimeChart from '@/components/Dashbord/RequestsOverTimeChart';
import OMSStatusStackedChart from '@/components/Dashbord/OMSStatusStackedChart';
import OutageTimeHeatmap from '@/components/Dashbord/OutageTimeHeatmap';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">ระบบจัดการคำขอดับไฟ - Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">จำนวนคำขอดับไฟตาม จุดรวมงาน</h2>
          <WorkCenterRequestsChart />
        </div>
        
        {/* <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">สัดส่วนสถานะคำขอ</h2>
          <RequestStatusPieChart />
        </div> */}
        
        {/* <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">จำนวนคำขอดับไฟตามเวลา</h2>
          <RequestsOverTimeChart />
        </div> */}
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">สัดส่วนสถานะ OMS ตาม จุดรวมงาน</h2>
          <OMSStatusStackedChart />
        </div>
        
        {/* <div className="bg-white p-4 rounded-lg shadow col-span-full">
          <h2 className="text-xl font-semibold mb-4">ช่วงเวลาที่มีการขอดับไฟบ่อยที่สุด</h2>
          <OutageTimeHeatmap />
        </div> */}
      </div>
    </div>
  );
}