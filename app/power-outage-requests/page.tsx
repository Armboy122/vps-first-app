import PrintAnnouncement from '@/components/PrintAnnouncement'
import prisma from '@/lib/prisma'


export default async function PowerOutageRequestPage() {


  return (
    <div className="container mx-auto p-4">
      <PrintAnnouncement />
      <h1 className="text-2xl font-bold mb-4">สร้างคำขอดับไฟใหม่</h1>
    </div>
  );
}
