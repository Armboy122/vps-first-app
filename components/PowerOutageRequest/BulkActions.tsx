"use client";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPrint, faFilter, faCheck, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import PrintAnnouncement from "../print";
import { Request } from "@prisma/client";
import { printSelectedRequests } from "./PrintService";

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

interface BulkActionsProps {
  isUser: boolean;
  isAdmin: boolean;
  selectedRequests: number[];
  requests: PowerOutageRequest[];
  handleBulkStatusChange: (status: Request) => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  isUser,
  isAdmin,
  selectedRequests,
  requests,
  handleBulkStatusChange,
}) => {
  return (
    <div className="mb-6 bg-white rounded-lg shadow-md p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {(isUser || isAdmin) && (
            <Link
              href="/power-outage-requests/create"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              สร้างคำขอดับไฟใหม่
            </Link>
          )}
          
          {selectedRequests.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  onChange={(e) => handleBulkStatusChange(e.target.value as Request)}
                  className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                >
                  <option value="">เปลี่ยนสถานะที่เลือก</option>
                  <option value="CONFIRM">อนุมัติดับไฟ</option>
                  <option value="CANCELLED">ยกเลิก</option>
                  <option value="NOT">รออนุมัติ</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
                </div>
              </div>
              
              <button
                onClick={() => printSelectedRequests(selectedRequests, requests)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center"
              >
                <FontAwesomeIcon icon={faPrint} className="mr-2" />
                พิมพ์เอกสาร
              </button>
            </div>
          ) : (
            <div className="text-gray-500 italic flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-yellow-500" />
              กรุณาเลือกรายการเพื่อดำเนินการ
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            <span className="font-medium">{selectedRequests.length}</span>
            <span className="ml-1">รายการที่เลือก</span>
          </div>
          <PrintAnnouncement />
        </div>
      </div>
    </div>
  );
}; 