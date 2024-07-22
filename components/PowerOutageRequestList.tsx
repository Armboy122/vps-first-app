// app/components/PowerOutageRequestList.tsx
'use client'

import { getPowerOutageRequests, updatePowerOutageRequest, deletePowerOutageRequest } from '@/app/api/action/powerOutageRequest'
import { useState, useEffect } from 'react'
import { useSession } from "next-auth/react"
import PowerOutageRequestForm from './PowerOutageRequestForm'
import { PowerOutageRequestInput } from '@/lib/validations/powerOutageRequest'

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
  area: string | null;
  omsStatus: string;
  statusUpdatedAt: Date | null;
  statusUpdatedById: number | null;
  createdBy: { fullName: string };
  workCenter: { name: string };
  branch: { shortName: string };
}

export default function PowerOutageRequestList() {
  const [requests, setRequests] = useState<PowerOutageRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const { data: session } = useSession()

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    try {
      setLoading(true)
      const result = await getPowerOutageRequests()
      const formattedResult = result.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt),
        outageDate: new Date(item.outageDate),
        startTime: new Date(item.startTime),
        endTime: new Date(item.endTime),
        statusUpdatedAt: item.statusUpdatedAt ? new Date(item.statusUpdatedAt) : null,
      }));
      setRequests(formattedResult)
      setError(null)
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      console.error('Error loading requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (id: number) => {
    setEditingId(id)
  }

  const handleUpdate = async (id: number, data: PowerOutageRequestInput) => {
    try {
      const result = await updatePowerOutageRequest(id, data)
      if (result.success && result.data) {
        setRequests(prevRequests => 
          prevRequests.map(req => req.id === id ? {
            ...req,
            ...result.data,
            createdAt: new Date(result.data.createdAt),
            outageDate: new Date(result.data.outageDate),
            startTime: new Date(result.data.startTime),
            endTime: new Date(result.data.endTime),
            statusUpdatedAt: result.data.statusUpdatedAt ? new Date(result.data.statusUpdatedAt) : null,
          } : req)
        )
        setEditingId(null)
      } else {
        // setError(result.message)
      }
    } catch (err) {
      setError('An error occurred while updating the request')
      console.error(err)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบคำขอนี้?')) {
      try {
        const result = await deletePowerOutageRequest(id)
        if (result.success) {
          setRequests(prevRequests => prevRequests.filter(req => req.id !== id))
        } else {
          setError(result.message)
        }
      } catch (err) {
        setError('An error occurred while deleting the request')
        console.error(err)
      }
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
            <th className="py-2 px-4 border-b">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            editingId === request.id ? (
              <tr key={request.id}>
                <td colSpan={9}>
                  <PowerOutageRequestForm
                    initialData={{
                      ...request,
                      outageDate: request.outageDate.toISOString().split('T')[0],
                      startTime: request.startTime.toTimeString().slice(0, 5),
                      endTime: request.endTime.toTimeString().slice(0, 5),
                      workCenterId: String(request.workCenterId),
                      branchId: String(request.branchId),
                      area: request.area
                    }}
                    onSubmit={(data) => handleUpdate(request.id, data)}
                    onCancel={handleCancelEdit}
                    role={session?.user?.role || ''}
                    workCenterId={String(request.workCenterId)}
                    branch={String(request.branchId)}
                  />
                </td>
              </tr>
            ) : (
              <tr key={request.id}>
                <td className="py-2 px-4 border-b">{request.outageDate.toLocaleDateString('th-TH')}</td>
                <td className="py-2 px-4 border-b">{request.startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="py-2 px-4 border-b">{request.endTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                {isAdmin && <td className="py-2 px-4 border-b">{request.workCenter.name}</td>}
                {isAdmin && <td className="py-2 px-4 border-b">{request.branch.shortName}</td>}
                <td className="py-2 px-4 border-b">{request.transformerNumber}</td>
                <td className="py-2 px-4 border-b">{request.omsStatus}</td>
                <td className="py-2 px-4 border-b">{request.createdBy.fullName}</td>
                <td className="py-2 px-4 border-b">
                  {(isAdmin || session?.user?.id === request.createdById.toString()) && (
                    <>
                      <button 
                        onClick={() => handleEdit(request.id)}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-2"
                      >
                        แก้ไข
                      </button>
                      <button 
                        onClick={() => handleDelete(request.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        ลบ
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  )
}