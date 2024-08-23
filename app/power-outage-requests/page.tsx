"use server"

import PowerOutageRequestList from '@/components/PowerOutageRequestList';
import PrintAnnouncement from '@/components/print';
import { FaBolt } from 'react-icons/fa'; // ต้องติดตั้ง react-icons ก่อน

export default async function PowerOutageRequestPage() {

  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-blue-600 p-6">
            <h2 className="text-3xl font-bold text-white flex items-center">
              <FaBolt className="mr-3" />
              รายการคำขอดับไฟ
            </h2>
            <PrintAnnouncement/>
          </div>
          <div className="p-6">
            <PowerOutageRequestList />
          </div>
        </div>
      </div>
    </div>
  );
}