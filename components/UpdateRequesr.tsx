import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PowerOutageRequestSchema, PowerOutageRequestInput } from '@/lib/validations/powerOutageRequest';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button,
  Stack
} from '@mui/material';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

interface UpdatePowerOutageRequestModalProps {
  initialData: PowerOutageRequestInput;
  onSubmit: (data: PowerOutageRequestInput) => void;
  onCancel: () => void;
  open: boolean;
}

const UpdatePowerOutageRequestModal: React.FC<UpdatePowerOutageRequestModalProps> = ({ initialData, onSubmit, onCancel, open }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<PowerOutageRequestInput>({
    resolver: zodResolver(PowerOutageRequestSchema),
    defaultValues: initialData,
  });

  const onFormSubmit = (data: PowerOutageRequestInput) => {
    onSubmit(data);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
        <DialogTitle>อัพเดตคำขอดับไฟ</DialogTitle>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <DialogContent>
            <Stack spacing={3}>
              <Controller
                name="startTime"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <MobileTimePicker
                    label="เวลาเริ่มต้น"
                    value={dayjs(value, 'HH:mm')}
                    onChange={(newValue: Dayjs | null) => {
                      onChange(newValue ? newValue.format('HH:mm') : '');
                    }}
                    ampm={false}
                    format="HH:mm"
                    slotProps={{
                      textField: {
                        variant: "outlined",
                        fullWidth: true,
                        error: !!errors.startTime,
                        helperText: errors.startTime?.message,
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="endTime"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <MobileTimePicker
                    label="เวลาสิ้นสุด"
                    value={dayjs(value, 'HH:mm')}
                    onChange={(newValue: Dayjs | null) => {
                      onChange(newValue ? newValue.format('HH:mm') : '');
                    }}
                    ampm={false}
                    format="HH:mm"
                    slotProps={{
                      textField: {
                        variant: "outlined",
                        fullWidth: true,
                        error: !!errors.endTime,
                        helperText: errors.endTime?.message,
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="area"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="พื้นที่"
                    variant="outlined"
                    fullWidth
                    error={!!errors.area}
                    helperText={errors.area?.message}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onCancel}>ยกเลิก</Button>
            <Button type="submit" variant="contained" color="primary">
              อัพเดต
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}

export default UpdatePowerOutageRequestModal;