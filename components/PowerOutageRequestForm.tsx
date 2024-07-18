// components/PowerOutageRequestForm.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PowerOutageRequestSchema, PowerOutageRequestInput } from '@/lib/validations/powerOutageRequest';
import { createPowerOutageRequest, searchTransformers, getBranchesByWorkCenter } from '../app/api/action/powerOutageRequest';
import { useRouter } from 'next/navigation';

interface WorkCenter {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  fullName: string;
}

interface Transformer {
  transformerNumber: string;
  gisDetails: string;
}

interface PowerOutageRequestFormProps {
  workCenters: WorkCenter[];
}

export default function PowerOutageRequestForm({ workCenters }: PowerOutageRequestFormProps) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [requests, setRequests] = useState<PowerOutageRequestInput[]>([]);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<PowerOutageRequestInput>({
    resolver: zodResolver(PowerOutageRequestSchema)
  });

  const watchWorkCenterId = watch('workCenterId');

  useEffect(() => {
    if (watchWorkCenterId) {
      loadBranches(Number(watchWorkCenterId));
    }
  }, [watchWorkCenterId]);

  const loadBranches = async (workCenterId: number) => {
    const branchData = await getBranchesByWorkCenter(workCenterId);
    setBranches(branchData);
  };

  const handleTransformerSearch = async (searchTerm: string) => {
    if (searchTerm.length >= 2) {
      const results = await searchTransformers(searchTerm);
      setTransformers(results);
    } else {
      setTransformers([]);
    }
  };

  const handleTransformerSelect = (transformer: Transformer) => {
    setValue('transformerNumber', transformer.transformerNumber);
    setValue('gisDetails', transformer.gisDetails);
    setTransformers([]);
  };

  const onSubmit = async (data: PowerOutageRequestInput) => {
    try {
      const result = await createPowerOutageRequest(data);
      if (result.success) {
        setSubmitStatus({ success: true, message: 'คำขอถูกบันทึกเรียบร้อยแล้ว' });
        reset();
        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        setSubmitStatus({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกคำขอ' });
      }
    } catch (error) {
      setSubmitStatus({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกคำขอ' });
    }
  };

  const onAddToList = (data: PowerOutageRequestInput) => {
    setRequests(prevRequests => [...prevRequests, data]);
    setSubmitStatus({ success: true, message: 'คำขอถูกเพิ่มเข้าสู่รายการแล้ว' });
    reset();
  };

  const handleSubmitAll = async () => {
    try {
      for (const request of requests) {
        await createPowerOutageRequest(request);
      }
      setRequests([]);
      setSubmitStatus({ success: true, message: 'คำขอทั้งหมดถูกบันทึกเรียบร้อยแล้ว' });
      reset();
      setTimeout(() => {
        router.back();
      }, 1000);
      
    } catch (error) {
      setSubmitStatus({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกคำขอ' });
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="outageDate" className="block mb-2">วันที่ดับไฟ:</label>
          <input
            type="date"
            id="outageDate"
            {...register('outageDate')}
            className="w-full p-2 border rounded"
          />
          {errors.outageDate && <p className="text-red-500">{errors.outageDate.message}</p>}
        </div>

        <div>
          <label htmlFor="startTime" className="block mb-2">เวลาเริ่มต้น:</label>
          <input
            type="time"
            id="startTime"
            {...register('startTime')}
            className="w-full p-2 border rounded"
          />
          {errors.startTime && <p className="text-red-500">{errors.startTime.message}</p>}
        </div>

        <div>
          <label htmlFor="endTime" className="block mb-2">เวลาสิ้นสุด:</label>
          <input
            type="time"
            id="endTime"
            {...register('endTime')}
            className="w-full p-2 border rounded"
          />
          {errors.endTime && <p className="text-red-500">{errors.endTime.message}</p>}
        </div>

        <div>
          <label htmlFor="workCenterId" className="block mb-2">ศูนย์งาน:</label>
          <select
            id="workCenterId"
            {...register('workCenterId')}
            className="w-full p-2 border rounded"
          >
            <option value="">เลือกศูนย์งาน</option>
            {workCenters.map(wc => (
              <option key={wc.id} value={wc.id}>{wc.name}</option>
            ))}
          </select>
          {errors.workCenterId && <p className="text-red-500">{errors.workCenterId.message}</p>}
        </div>

        <div>
          <label htmlFor="branchId" className="block mb-2">สาขา:</label>
          <select
            id="branchId"
            {...register('branchId')}
            className="w-full p-2 border rounded"
          >
            <option value="">เลือกสาขา</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.fullName}</option>
            ))}
          </select>
          {errors.branchId && <p className="text-red-500">{errors.branchId.message}</p>}
        </div>

        <div>
          <label htmlFor="transformerNumber" className="block mb-2">หมายเลขหม้อแปลง:</label>
          <input
            type="text"
            id="transformerNumber"
            {...register('transformerNumber', {
              onChange: (e) => handleTransformerSearch(e.target.value)
            })}
            className="w-full p-2 border rounded"
          />
          {errors.transformerNumber && <p className="text-red-500">{errors.transformerNumber.message}</p>}
          {transformers.length > 0 && (
            <ul className="mt-2 border rounded absolute z-10 bg-white w-full">
              {transformers.map(t => (
                <li
                  key={t.transformerNumber}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleTransformerSelect(t)}
                >
                  {t.transformerNumber} - {t.gisDetails}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="gisDetails" className="block mb-2">รายละเอียด GIS:</label>
          <input
            type="text"
            id="gisDetails"
            {...register('gisDetails')}
            className="w-full p-2 border rounded"
            readOnly
          />
          {errors.gisDetails && <p className="text-red-500">{errors.gisDetails.message}</p>}
        </div>

        <div>
          <label htmlFor="area" className="block mb-2">พื้นที่:</label>
          <input
            type="text"
            id="area"
            {...register('area')}
            className="w-full p-2 border rounded"
          />
          {errors.area && <p className="text-red-500">{errors.area.message}</p>}
        </div>

        <div className="flex space-x-2">
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            บันทึกคำขอนี้
          </button>
          <button type="button" onClick={handleSubmit(onAddToList)} className="bg-green-500 text-white p-2 rounded">
            เพิ่มเข้ารายการ
          </button>
        </div>
      </form>

      {submitStatus && (
        <div className={`mt-4 p-2 ${submitStatus.success ? 'bg-green-100' : 'bg-red-100'}`}>
          {submitStatus.message}
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-bold">รายการคำขอที่รอการบันทึก</h2>
          <ul>
            {requests.map((request, index) => (
              <li key={index}>
                หม้อแปลง: {request.transformerNumber}, วันที่: {request.outageDate}
              </li>
            ))}
          </ul>
          <button onClick={handleSubmitAll} className="mt-2 bg-green-500 text-white p-2 rounded">
            บันทึกคำขอทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}