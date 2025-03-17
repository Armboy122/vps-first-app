"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";

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
  statusRequest: string;
  statusUpdatedAt: Date | null;
  statusUpdatedById: number | null;
  createdBy: { fullName: string };
  workCenter: { name: string; id: number };
  branch: { shortName: string };
}

interface ActionButtonsProps {
  request: PowerOutageRequest;
  onEdit: (request: PowerOutageRequest) => void;
  onDelete: (id: number) => void;
  isAdmin: boolean;
  isUser: boolean;
  userWorkCenterId?: number;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  request,
  onEdit,
  onDelete,
  isAdmin,
  isUser,
  userWorkCenterId,
}) => {
  const canEdit = isAdmin || (isUser && request.workCenter.id === userWorkCenterId);

  if (!canEdit) {
    return null;
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => onEdit(request)}
        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-sm transition duration-300 flex items-center"
        aria-label="แก้ไข"
      >
        <FontAwesomeIcon icon={faEdit} />
      </button>
      <button
        onClick={() => onDelete(request.id)}
        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm transition duration-300 flex items-center"
        aria-label="ลบ"
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </div>
  );
}; 