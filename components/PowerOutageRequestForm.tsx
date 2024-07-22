// components/PowerOutageRequestForm.tsx

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PowerOutageRequestSchema, PowerOutageRequestInput } from '@/lib/validations/powerOutageRequest';
import { createPowerOutageRequest, updatePowerOutageRequest, searchTransformers } from '@/app/api/action/powerOutageRequest';
import { getBranches } from '@/app/api/action/getWorkCentersAndBranches';

interface WorkCenter {
  id: number;
  name: string;
}

interface Branch { 
  id: number;
  shortName: string;
  workCenterId: number;
}

interface Transformer {
  transformerNumber: string;
  gisDetails: string;
}

interface PowerOutageRequestFormProps {
  initialData?: PowerOutageRequestInput;
  onSubmit: (data: PowerOutageRequestInput) => void;
  onCancel?: () => void;
  workCenters?: WorkCenter[];
  role: string;
  workCenterId?: string;
  branch?: string;
}

export default function PowerOutageRequestForm({
  initialData,
  onSubmit,
  onCancel,
  workCenters,
  role,
  workCenterId,
  branch
}: PowerOutageRequestFormProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PowerOutageRequestInput>({
    resolver: zodResolver(PowerOutageRequestSchema),
    defaultValues: initialData || {
      workCenterId: workCenterId,
      branchId: branch
    }
  });

  const watchWorkCenterId = watch('workCenterId');

  useEffect(() => {
    if (role !== 'ADMIN') {
      if (workCenterId) {
        setValue('workCenterId', workCenterId);
        loadBranches(Number(workCenterId));
      }
      if (branch) {
        setValue('branchId', branch);
      }
    } else if (watchWorkCenterId) {
      loadBranches(Number(watchWorkCenterId));
    }
  }, [role, workCenterId, branch, watchWorkCenterId, setValue]);

  const loadBranches = async (workCenterId: number) => {
    const branchData = await getBranches(workCenterId);
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

  const handleFormSubmit = useCallback(async (data: PowerOutageRequestInput) => {
    const start = new Date(`${data.outageDate}T${data.startTime}`);
    const end = new Date(`${data.outageDate}T${data.endTime}`);
    
    if (end <= start) {
      setSubmitStatus({ success: false, message: 'เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น' });
      return;
    }
  
    try {
      await onSubmit(data);
      setSubmitStatus({ success: true, message: 'คำขอถูกบันทึกเรียบร้อยแล้ว' });
    } catch (error) {
      setSubmitStatus({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกคำขอ' });
    }
  }, [onSubmit]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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

      {role === 'ADMIN' && (
        <>
          <div>
            <label htmlFor="workCenterId" className="block mb-2">ศูนย์งาน:</label>
            <select
              id="workCenterId"
              {...register('workCenterId')}
              className="w-full p-2 border rounded"
              disabled={!!initialData}
            >
              <option value="">เลือกศูนย์งาน</option>
              {workCenters?.map(wc => (
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
              disabled={!!initialData}
            >
              <option value="">เลือกสาขา</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.shortName}</option>
              ))}
            </select>
            {errors.branchId && <p className="text-red-500">{errors.branchId.message}</p>}
          </div>
        </>
      )}

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
          {initialData ? 'อัพเดตคำขอ' : 'บันทึกคำขอ'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="bg-gray-500 text-white p-2 rounded">
            ยกเลิก
          </button>
        )}
      </div>

      {submitStatus && (
        <div className={`mt-4 p-2 ${submitStatus.success ? 'bg-green-100' : 'bg-red-100'}`}>
          {submitStatus.message}
        </div>
      )}
    </form>
  );
}