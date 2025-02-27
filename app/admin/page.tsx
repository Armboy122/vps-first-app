"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "react-query";
import { debounce } from "lodash";

// Services
import { deleteUser, getUsers, updateUserRole } from "../api/action/User";
import { getWorkCenters } from "../api/action/getWorkCentersAndBranches";

// ---------- Types ---------- //

// ประเภทข้อมูลผู้ใช้ที่ใช้แสดงในตาราง
interface User {
  id: number;
  fullName: string;
  employeeId: string;
  role: Role;
  workCenter: {
    // id: number;
    name: string;
  };
  branch: {
    // id: number;
    fullName: string;
  };
}

// ประเภทข้อมูลจุดรวมงาน
interface WorkCenter {
  id: number;
  name: string;
}

// พารามิเตอร์สำหรับการค้นหาและการแบ่งหน้า
interface UserSearchParams {
  page: number;
  limit: number;
  search: string;
  workCenterId?: string;
}

// ข้อมูลที่เก็บใน Context
interface UserContextType {
  searchParams: UserSearchParams;
  updateSearchParams: (newParams: Partial<UserSearchParams>) => void;
}

// ---------- ค่าคงที่ ---------- //

// แปลค่า Role Enum เป็นข้อความภาษาไทย
const ROLE_TRANSLATIONS: { [key in Role]: string } = {
  VIEWER: "กฟต.3",
  ADMIN: "Admin",
  MANAGER: "ผู้บริหารจุดรวมงาน",
  SUPERVISOR: "พนักงาน EO",
  USER: "พนักงานหม้อแปลง",
};

// จำนวนผู้ใช้ต่อหน้า
const USERS_PER_PAGE = 10;

// ---------- Context สำหรับการจัดการพารามิเตอร์การค้นหา ---------- //

const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider สำหรับเก็บและอัพเดทพารามิเตอร์การค้นหา
const UserProvider = ({ children, initialParams }: { children: ReactNode; initialParams: UserSearchParams }) => {
  const [searchParams, setSearchParams] = useState<UserSearchParams>(initialParams);

  const updateSearchParams = (newParams: Partial<UserSearchParams>) => {
    setSearchParams(prev => ({ ...prev, ...newParams }));
  };

  return (
    <UserContext.Provider value={{ searchParams, updateSearchParams }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook สำหรับเข้าถึง Context
const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext ต้องใช้ภายใน UserProvider");
  }
  return context;
};

// ---------- Components ---------- //

// แสดงตัวโหลดระหว่างรอข้อมูล
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
  </div>
);

// แสดงข้อความเมื่อเกิดข้อผิดพลาด
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="text-red-500 text-center text-xl mt-10">{message}</div>
);

// คอมโพเนนต์ส่วนค้นหาและกรอง
const SearchBar = () => {
  const { searchParams, updateSearchParams } = useUserContext();
  const [searchValue, setSearchValue] = useState(searchParams.search);
  
  // โหลดข้อมูลจุดรวมงานด้วย React Query
  const { data: workCenters = [], isLoading } = useQuery(
    ['workCenters'],
    async () => {
      try {
        const result = await getWorkCenters();
        // แปลงผลลัพธ์เป็น plain object โดยสมบูรณ์
        return Array.isArray(result) ? result.map(item => ({...item})) : [];
      } catch (error) {
        console.error("Error fetching work centers:", error);
        return [];
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  // ชะลอการค้นหาเพื่อลดการเรียก API บ่อยเกินไป
  const handleSearchChange = debounce((value: string) => {
    updateSearchParams({ search: value, page: 1 });
  }, 300);

  const handleWorkCenterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    updateSearchParams({ workCenterId: value, page: 1 });
  };

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    handleSearchChange(value);
  };

  if (isLoading) return <div>กำลังโหลดข้อมูลจุดรวมงาน...</div>;

  return (
    <div className="flex mb-4 space-x-4">
      <input
        type="text"
        placeholder="ค้นหาด้วยรหัสพนักงานหรือชื่อ"
        value={searchValue}
        onChange={onSearchInputChange}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      />
      <select
        value={searchParams.workCenterId || ""}
        onChange={handleWorkCenterChange}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      >
        <option value="">ทุกจุดรวมงาน</option>
        {workCenters.map((center) => (
          <option key={center.id} value={center.id.toString()}>
            {center.name}
          </option>
        ))}
      </select>
      <Link href="/admin/create-user">
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          สร้าง User ใหม่
        </button>
      </Link>
    </div>
  );
};

// คอมโพเนนต์แสดงแถวข้อมูลผู้ใช้แต่ละคน
const UserRow = ({ user, index }: { user: User; index: number }) => {
  const queryClient = useQueryClient();
  
  // Mutation สำหรับอัพเดทบทบาท
  const updateRoleMutation = useMutation(
    ({ userId, newRole }: { userId: number; newRole: Role }) => 
      updateUserRole(userId, newRole),
    {
      onSuccess: () => {
        // อัพเดทแคชข้อมูล
        queryClient.invalidateQueries('users');
      },
    }
  );

  // Mutation สำหรับลบผู้ใช้
  const deleteMutation = useMutation(
    (userId: number) => deleteUser(userId),
    {
      onSuccess: () => {
        // อัพเดทแคชข้อมูล
        queryClient.invalidateQueries('users');
      },
    }
  );
  
  const handleRoleChange = (userId: number, newRole: Role) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  const handleDelete = (userId: number) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?")) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <tr className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
      <td className="px-4 py-3">{user.employeeId}</td>
      <td className="px-4 py-3">{user.fullName}</td>
      <td className="px-4 py-3">{user.workCenter.name}</td>
      <td className="px-4 py-3">{user.branch.fullName}</td>
      <td className="px-4 py-3">
        <select
          value={user.role}
          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
          className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          disabled={updateRoleMutation.isLoading}
        >
          {Object.entries(ROLE_TRANSLATIONS).map(([role, label]) => (
            <option key={role} value={role}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => handleDelete(user.id)}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
          disabled={deleteMutation.isLoading}
        >
          {deleteMutation.isLoading ? "กำลังลบ..." : "ลบ"}
        </button>
      </td>
    </tr>
  );
};

// คอมโพเนนต์แสดงตารางข้อมูลผู้ใช้
const UserTable = () => {
  const { searchParams } = useUserContext();
  
  // ดึงข้อมูลผู้ใช้ตามพารามิเตอร์การค้นหา
  const { data, isLoading, error } = useQuery(
    ['users', searchParams], // key จะเปลี่ยนเมื่อพารามิเตอร์เปลี่ยน
    () => getUsers(
      searchParams.page,
      searchParams.limit,
      searchParams.search,
      searchParams.workCenterId
    ),
    {
      keepPreviousData: true, // เก็บข้อมูลเก่าไว้แสดงระหว่างโหลดข้อมูลใหม่
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="ไม่สามารถโหลดข้อมูลผู้ใช้ได้" />;
  if (!data?.users || data.users.length === 0) {
    return <div className="text-center py-4">ไม่พบข้อมูลผู้ใช้</div>;
  }

  return (
    <div className="overflow-x-auto shadow-md sm:rounded-lg">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="px-4 py-3 text-left">รหัสพนักงาน</th>
            <th className="px-4 py-3 text-left">ชื่อ</th>
            <th className="px-4 py-3 text-left">จุดรวมงาน</th>
            <th className="px-4 py-3 text-left">สังกัด</th>
            <th className="px-4 py-3 text-left">บทบาท</th>
            <th className="px-4 py-3 text-left">การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((user, index) => (
            <UserRow key={user.id} user={user} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// คอมโพเนนต์แสดงปุ่มแบ่งหน้า
const Pagination = () => {
  const { searchParams, updateSearchParams } = useUserContext();
  
  // ใช้ข้อมูลเดียวกับ UserTable โดยไม่ต้องโหลดใหม่
  const { data } = useQuery(
    ['users', searchParams],
    () => getUsers(
      searchParams.page,
      searchParams.limit,
      searchParams.search,
      searchParams.workCenterId
    ),
    {
      keepPreviousData: true,
    }
  );

  if (!data || data.totalPages <= 1) return null;

  return (
    <div className="mt-4 flex justify-center">
      {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => updateSearchParams({ page })}
          className={`mx-1 px-3 py-1 border ${
            searchParams.page === page
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-200"
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
};

// เนื้อหาหลักของหน้า
function UserPageContent() {
  // ค่าเริ่มต้นของพารามิเตอร์การค้นหา
  const initialSearchParams: UserSearchParams = {
    page: 1,
    limit: USERS_PER_PAGE,
    search: "",
  };

  return (
    <UserProvider initialParams={initialSearchParams}>
      <div className="container mx-auto p-4 min-h-screen">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">
            รายชื่อพนักงาน
          </h1>

          <SearchBar />
          <UserTable />
          <Pagination />
        </div>
      </div>
    </UserProvider>
  );
}

// คอมโพเนนต์หลักพร้อม React Query
export default function UserPage() {
  // ตั้งค่า React Query Client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false, // ไม่โหลดข้อมูลใหม่เมื่อกลับมาที่หน้าต่าง
        retry: 1, // ลองใหม่ 1 ครั้งเมื่อเกิดข้อผิดพลาด
        staleTime: 30000, // ข้อมูลจะเป็น stale หลังจาก 30 วินาที
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <UserPageContent />
    </QueryClientProvider>
  );
}