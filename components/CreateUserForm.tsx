"use client";

import {
  createUser,
  getBranches,
  getWorkCenters,
} from "../app/api/action/createUser";
import { useState, useEffect } from "react";

type WorkCenter = {
  id: number;
  name: string;
};

type Branch = {
  id: number;
  shortName: string;
  workCenterId: number;
};

type UserRole = "USER" | "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "SUPERVISOR";
type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export default function CreateUserForm() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<number | "">("");
  const [selectedBranch, setSelectedBranch] = useState<number | "">("");
  const [formData, setFormData] = useState({
    password: "",
    fullName: "",
    employeeId: "",
    role: "USER",
    status: "ACTIVE",
    permissions: [] as number[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsLoading(true);
    getWorkCenters()
      .then(setWorkCenters)
      .catch((err) => setError("Failed to load work centers"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedWorkCenter) {
      setIsLoading(true);
      getBranches(Number(selectedWorkCenter))
        .then(setBranches)
        .catch((err) => setError("Failed to load branches"))
        .finally(() => setIsLoading(false));
    } else {
      setBranches([]);
    }
    setSelectedBranch("");
  }, [selectedWorkCenter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (selectedWorkCenter && selectedBranch) {
      const userData = {
        ...formData,
        workCenterId: Number(selectedWorkCenter),
        branchId: Number(selectedBranch),
        role: formData.role as UserRole,
        status: formData.status as UserStatus,
      };
      try {
        setIsLoading(true);
        const result = await createUser(userData);
        if (result.success) {
          alert("User created successfully!");
          // Reset form
          setFormData({
            password: "",
            fullName: "",
            employeeId: "",
            role: "USER" as UserRole,
            status: "ACTIVE" as UserStatus,
            permissions: [] as number[],
          });
          setSelectedWorkCenter("");
          setSelectedBranch("");
        } else {
          setError(`Failed to create user: ${result.error}`);
        }
      } catch (err) {
        setError("An error occurred while creating the user");
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="employeeId" className="block mb-1">
          รหัสพนักงาน
        </label>
        <input
          type="text"
          id="employeeId"
          value={formData.employeeId}
          onChange={(e) =>
            setFormData({ ...formData, employeeId: e.target.value })
          }
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="block mb-1">
          รหัสผ่าน
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label htmlFor="fullName" className="block mb-1">
          Full Name
        </label>
        <input
          type="text"
          id="fullName"
          value={formData.fullName}
          onChange={(e) =>
            setFormData({ ...formData, fullName: e.target.value })
          }
          className="w-full p-2 border rounded"
          required
        />
      </div>

      

      <div>
        <label htmlFor="workCenter" className="block mb-1">
          Work Center
        </label>
        <select
          id="workCenter"
          value={selectedWorkCenter}
          onChange={(e) => setSelectedWorkCenter(Number(e.target.value))}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Work Center</option>
          {workCenters.map((wc) => (
            <option key={wc.id} value={wc.id}>
              {wc.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="branch" className="block mb-1">
          Branch
        </label>
        <select
          id="branch"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(Number(e.target.value))}
          className="w-full p-2 border rounded"
          required
          disabled={!selectedWorkCenter}
        >
          <option value="">Select Branch</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.shortName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="role" className="block mb-1">
          Role
        </label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as UserRole })
          }
          className="w-full p-2 border rounded"
          required
        >
          <option value="USER">User</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      <div>
        <label htmlFor="status" className="block mb-1">
          Status
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as UserStatus })
          }
          className="w-full p-2 border rounded"
          required
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* หมายเหตุ: ส่วนของ permissions ยังไม่ได้เพิ่ม คุณอาจต้องเพิ่มตามความเหมาะสมของแอพพลิเคชันของคุณ */}

      <button
        type="submit"
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        disabled={isLoading}
      >
        {isLoading ? "Creating..." : "Create User"}
      </button>

      {error && <div className="text-red-500">{error}</div>}
    </form>
  );
}
