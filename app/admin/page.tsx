"use client";

import { useState, useEffect, useCallback } from "react";
import { getUsers, updateUserRole, updateUserName } from "../api/action/User";
import { getWorkCenters } from "../api/action/getWorkCentersAndBranches";
import Link from "next/link";
import debounce from 'lodash/debounce';
import { Role } from "@prisma/client";

// กำหนดโครงสร้างข้อมูลของ User
interface User {
  id: number;
  fullName: string;
  employeeId: string;
  role: string;
  workCenter: { name: string };
  branch: { fullName: string };
}

// กำหนดโครงสร้างข้อมูลของ WorkCenter
interface WorkCenter {
  id: number;
  name: string;
}

// แปลงค่า Role เป็นภาษาไทย
const roleTranslations: { [key: string]: string } = {
  USER: "พนักงานหม้อแปลง",
  SUPERVISOR: "พนักงาน EO",
  MANAGER: "ผู้บริหารจุดรวมงาน",
  ADMIN: "Admin",
  VIEWER: "กฟต.3",
};

export default function UserPage() {
  // สถานะต่างๆ ของหน้า
  const [users, setUsers] = useState<User[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [workCenterFilter, setWorkCenterFilter] = useState("");
  const [editingName, setEditingName] = useState<{ [key: number]: string }>({});

  // ฟังก์ชันสำหรับดึงข้อมูล Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUsers(currentPage, 10, search, workCenterFilter);
      if (result.users) {
        setUsers(result.users);
        setTotalPages(result.totalPages);
      } else {
        setError("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, workCenterFilter]);

  // ฟังก์ชันสำหรับดึงข้อมูล WorkCenters
  const fetchWorkCenters = useCallback(async () => {
    try {
      const centers = await getWorkCenters();
      setWorkCenters(centers);
    } catch (err) {
      console.error("ไม่สามารถดึงข้อมูลจุดรวมงานได้:", err);
    }
  }, []);

  // เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อหน้าโหลด
  useEffect(() => {
    fetchUsers();
    fetchWorkCenters();
  }, [fetchUsers, fetchWorkCenters]);

  // ฟังก์ชันสำหรับเปลี่ยนบทบาทของผู้ใช้
  const handleRoleChange = async (userId: number, newRole: Role) => {
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
    } else {
      setError(result.error || "ไม่สามารถอัพเดทบทบาทได้");
    }
  };

  // ฟังก์ชันสำหรับเปลี่ยนชื่อของผู้ใช้
  const handleNameChange = async (userId: number) => {
    const newName = editingName[userId];
    if (!newName) return;

    const result = await updateUserName(userId, newName);
    if (result.success) {
      setEditingName(prev => ({ ...prev, [userId]: "" }));
      await fetchUsers(); // โหลดข้อมูลใหม่หลังจากเปลี่ยนชื่อ
    } else {
      setError(result.error || "ไม่สามารถอัพเดทชื่อได้");
    }
  };

  // ใช้ debounce เพื่อหน่วงเวลาการค้นหา
  const debouncedSearch = debounce((value) => {
    setSearch(value);
    setCurrentPage(1); // รีเซ็ตหน้าเมื่อมีการค้นหาใหม่
  }, 1000);

  // แสดงตัวโหลดขณะกำลังโหลดข้อมูล
  if (isLoading) return <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
  </div>;

  // แสดงข้อผิดพลาด (ถ้ามี)
  if (error) return <div className="text-red-500 text-center text-xl mt-10">{error}</div>;

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">รายชื่อพนักงาน</h1>
        
        {/* ส่วนค้นหาและกรอง */}
        <div className="flex mb-4 space-x-4">
          <input
            type="text"
            placeholder="ค้นหาด้วยรหัสพนักงานหรือชื่อ"
            onChange={(e) => debouncedSearch(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <select
            value={workCenterFilter}
            onChange={(e) => {
              setWorkCenterFilter(e.target.value);
              setCurrentPage(1); // รีเซ็ตหน้าเมื่อเปลี่ยนตัวกรอง
            }}
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

        {/* ตารางแสดงข้อมูลผู้ใช้ */}
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
              {users.map((user, index) => (
                <tr key={user.id} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
                  <td className="px-4 py-3">{user.employeeId}</td>
                  <td className="px-4 py-3">
                    {editingName[user.id] !== undefined ? (
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={editingName[user.id]}
                          onChange={(e) => setEditingName(prev => ({ ...prev, [user.id]: e.target.value }))}
                          className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                        />
                        <button
                          onClick={() => handleNameChange(user.id)}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                        >
                          ยืนยัน
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => setEditingName(prev => ({ ...prev, [user.id]: user.fullName }))}
                        className="cursor-pointer hover:text-blue-500"
                      >
                        {user.fullName}
                      </span>
                    )}
                  </td>
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

        {/* ปุ่มเปลี่ยนหน้า */}
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