import CreateUserForm from "@/components/CreateUserForm";
import Link from "next/link";

export default function CreateUserPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                ✨ สร้างผู้ใช้ใหม่
              </h1>
              <p className="text-gray-600 text-lg">
                เพิ่มผู้ใช้ใหม่เข้าสู่ระบบด้วยข้อมูลที่ครบถ้วน
              </p>
            </div>
            <Link href="/admin">
              <button className="group bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200">
                <span className="flex items-center">
                  <span className="mr-2 group-hover:-translate-x-1 transition-transform duration-200">
                    ←
                  </span>
                  กลับไปหน้า Admin
                </span>
              </button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <span className="ml-2 text-blue-600 font-medium">
                  ข้อมูลพื้นฐาน
                </span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <span className="ml-2 text-blue-600 font-medium">หน่วยงาน</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <span className="ml-2 text-blue-600 font-medium">
                  สิทธิ์การใช้งาน
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <CreateUserForm />
        </div>
      </div>
    </div>
  );
}
