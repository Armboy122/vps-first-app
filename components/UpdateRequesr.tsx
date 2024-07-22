import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PowerOutageRequestSchema, PowerOutageRequestInput } from '@/lib/validations/powerOutageRequest';

interface UpdatePowerOutageRequestModalProps {
  initialData: PowerOutageRequestInput;
  onSubmit: (data: PowerOutageRequestInput) => void;
  onCancel: () => void;
}

const UpdatePowerOutageRequestModal: React.FC<UpdatePowerOutageRequestModalProps> = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<PowerOutageRequestInput>({
    resolver: zodResolver(PowerOutageRequestSchema),
    defaultValues: initialData,
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-4">อัพเดตคำขอดับไฟ</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <label htmlFor="gisDetails" className="block mb-2">พื้นที่:</label>
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
              อัพเดต
            </button>
            <button type="button" onClick={onCancel} className="bg-gray-500 text-white p-2 rounded">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdatePowerOutageRequestModal;