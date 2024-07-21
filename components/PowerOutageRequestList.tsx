// app/components/PowerOutageRequestList.tsx
'use client'

import { getPowerOutageRequests } from '@/app/api/action/powerOutageRequest'
import { useState, useEffect } from 'react'
import { useSession } from "next-auth/react"

interface PowerOutageRequest {
  id: number;
  createdAt: Date;
  createdById: number;
  outageDate: Date;
  startTime: Date;
  endTime: Date;
  workCenterId: number;
  branchId: number;
  transformerNumber: string;
  gisDetails: string;
  area?: string;
  omsStatus: string;
  statusUpdatedAt?: Date;
  statusUpdatedById?: number | null;
  createdBy: { fullName: string };
  workCenter: { name: string };
  branch: { shortName: string };
}

export default function PowerOutageRequestList() {
  const [requests, setRequests] = useState<PowerOutageRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    try {
      setLoading(true)
      const result = await getPowerOutageRequests()
      setRequests(result as PowerOutageRequest[])
      setError(null)
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      console.error('Error loading requests:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>กำลังโหลดข้อมูล...</div>
  if (error) return <div className="text-red-500">{error}</div>

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">รายการคำขอดับไฟ</h2>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">วันที่ดับไฟ</th>
            <th className="py-2 px-4 border-b">เวลาเริ่มต้น</th>
            <th className="py-2 px-4 border-b">เวลาสิ้นสุด</th>
            {isAdmin && <th className="py-2 px-4 border-b">ศูนย์งาน</th>}
            {isAdmin && <th className="py-2 px-4 border-b">สาขา</th>}
            <th className="py-2 px-4 border-b">หมายเลขหม้อแปลง</th>
            <th className="py-2 px-4 border-b">สถานะ OMS</th>
            <th className="py-2 px-4 border-b">ผู้สร้างคำขอ</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="py-2 px-4 border-b">{new Date(request.outageDate).toLocaleDateString('th-TH')}</td>
              <td className="py-2 px-4 border-b">{new Date(request.startTime).toLocaleTimeString('th-TH')}</td>
              <td className="py-2 px-4 border-b">{new Date(request.endTime).toLocaleTimeString('th-TH')}</td>
              {isAdmin && <td className="py-2 px-4 border-b">{request.workCenter.name}</td>}
              {isAdmin && <td className="py-2 px-4 border-b">{request.branch.shortName}</td>}
              <td className="py-2 px-4 border-b">{request.transformerNumber}</td>
              <td className="py-2 px-4 border-b">{request.omsStatus}</td>
              <td className="py-2 px-4 border-b">{request.createdBy.fullName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}