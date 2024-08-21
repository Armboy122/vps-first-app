"use client";

import { useState, useEffect, useCallback } from "react";
import { getUsers, updateUserRole } from "../api/action/User";
import { getWorkCenters } from "../api/action/getWorkCentersAndBranches";
import Link from "next/link";
import { Role } from "@prisma/client";

// กำหนด Role enum ตามที่มีใน Prisma schema

interface User {
  id: number;
  fullName: string;
  employeeId: string;
  role: Role;
  workCenter: { name: string };
  branch: { fullName: string };
}

interface WorkCenter {
  id: number;
  name: string;
}

const roleTranslations: { [key in Role]: string } = {
  VIEWER: "กฟต.3",
  ADMIN: "Admin",
  MANAGER: "ผู้บริหารจุดรวมงาน",
  SUPERVISOR: "พนักงาน EO",
  USER: "พนักงานหม้อแปลง"
};

export default function UserPage() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [workCenterFilter, setWorkCenterFilter] = useState("");
  const usersPerPage = 10;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUsers(currentPage, usersPerPage, search, workCenterFilter);
      if (result.users) {
        setAllUsers(result.users);
        setFilteredUsers(result.users);
        setTotalPages(result.totalPages);
      } else {
        setError("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, usersPerPage, search, workCenterFilter]);

  const fetchWorkCenters = useCallback(async () => {
    try {
      const centers = await getWorkCenters();
      setWorkCenters(centers);
    } catch (err) {
      console.error("ไม่สามารถดึงข้อมูลจุดรวมงานได้:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchWorkCenters();
  }, [fetchUsers, fetchWorkCenters]);

  const handleRoleChange = async (userId: number, newRole: Role) => {
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      setAllUsers(users => users.map(user => user.id === userId ? { ...user, role: newRole } : user));
      setFilteredUsers(users => users.map(user => user.id === userId ? { ...user, role: newRole } : user));
    } else {
      setError(result.error || "ไม่สามารถอัพเดทบทบาทได้");
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleWorkCenterFilter = (value: string) => {
    setWorkCenterFilter(value);
    setCurrentPage(1);
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
  </div>;

  if (error) return <div className="text-red-500 text-center text-xl mt-10">{error}</div>;

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">รายชื่อพนักงาน</h1>
        
        <div className="flex mb-4 space-x-4">
          <input
            type="text"
            placeholder="ค้นหาด้วยรหัสพนักงานหรือชื่อ"
            onChange={(e) => handleSearch(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <select
            value={workCenterFilter}
            onChange={(e) => handleWorkCenterFilter(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">ทุกจุดรวมงาน</option>
            {workCenters.map((center) => (
              <option key={center.id} value={center.id.toString()}>{center.name}</option>
            ))}
          </select>
          <Link href="/admin/create-user">
            <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              สร้าง User ใหม่
            </button>
          </Link>
        </div>

        <div className="overflow-x-auto shadow-md sm:rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left">รหัสพนักงาน</th>
                <th className="px-4 py-3 text-left">ชื่อ</th>
                <th className="px-4 py-3 text-left">จุดรวมงาน</th>
                <th className="px-4 py-3 text-left">สังกัด</th>
                <th className="px-4 py-3 text-left">บทบาท</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user.id} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
                  <td className="px-4 py-3">{user.employeeId}</td>
                  <td className="px-4 py-3">{user.fullName}</td>
                  <td className="px-4 py-3">{user.workCenter.name}</td>
                  <td className="px-4 py-3">{user.branch.fullName}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                      {Object.entries(roleTranslations).map(([role, label]) => (
                        <option key={role} value={role}>{label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`mx-1 px-3 py-1 border ${currentPage === page ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}