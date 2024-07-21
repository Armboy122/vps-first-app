import PowerOutageRequestList from '@/components/PowerOutageRequestList';
import PrintAnnouncement from '@/components/PrintAnnouncement'
import prisma from '@/lib/prisma'
import Link from 'next/link';


export default async function PowerOutageRequestPage() {


  return (
    <div className="container mx-auto p-4">
      <PrintAnnouncement />
      <h1 className="text-2xl font-bold mb-4">แผนงานดับไฟ</h1>
      <Link href="/power-outage-requests/create" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        สร้างคำขอดับไฟใหม่
      </Link>

      <PowerOutageRequestList />
    </div>
  );
}
