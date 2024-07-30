"use sever"
import PowerOutageRequestList from '@/components/PowerOutageRequestList';
import PrintAnnouncement from '@/components/PrintAnnouncement'



export default async function PowerOutageRequestPage() {
  


  return (
    <div className="container mx-auto p-4">
      {/* <PrintAnnouncement /> */}
      <h1 className="text-2xl font-bold mb-4">แผนงานดับไฟ</h1>
     

      <PowerOutageRequestList />
    </div>
  );
}
