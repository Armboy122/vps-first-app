import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PowerOutageRequestInput,
  PowerOutageRequestUpdateSchema,
} from "@/lib/validations/powerOutageRequest";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { FormTimePicker } from "@/components/forms";

interface UpdatePowerOutageRequestModalProps {
  initialData: PowerOutageRequestInput;
  onSubmit: (data: PowerOutageRequestInput) => void;
  onCancel: () => void;
  open: boolean;
  canEditOutageDate: boolean;
}

const UpdatePowerOutageRequestModal: React.FC<
  UpdatePowerOutageRequestModalProps
> = ({ initialData, onSubmit, onCancel, open, canEditOutageDate }) => {
  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<PowerOutageRequestInput>({
    resolver: zodResolver(PowerOutageRequestUpdateSchema),
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
              <TextField
                {...register("outageDate")}
                label="วันที่ดับไฟ"
                type="date"
                variant="outlined"
                fullWidth
                inputProps={{ readOnly: !canEditOutageDate }}
                error={!!errors.outageDate}
                helperText={
                  canEditOutageDate
                    ? errors.outageDate?.message
                    : "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขวันที่ดับไฟได้"
                }
                InputLabelProps={{ shrink: true }}
              />

              <FormTimePicker
                name="startTime"
                control={control}
                label="เวลาเริ่มต้น"
                error={errors.startTime}
              />

              <FormTimePicker
                name="endTime"
                control={control}
                label="เวลาสิ้นสุด"
                error={errors.endTime}
              />

              <TextField
                {...register("area")}
                label="พื้นที่"
                variant="outlined"
                fullWidth
                error={!!errors.area}
                helperText={errors.area?.message}
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
};

export default UpdatePowerOutageRequestModal;
