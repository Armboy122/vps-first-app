import CreateUserForm from "@/components/CreateUserForm";
import Link from 'next/link';

export default function CreateUserPage() {
  return (
    <div className="container mx-auto p-4 min-h-screen max-w-4xl">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">สร้างผู้ใช้ใหม่</h1>
          <Link href="/admin">
            <button className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              กลับไปหน้ารายชื่อผู้ใช้
            </button>
          </Link>
        </div>
        <CreateUserForm />
      </div>
    </div>
  )
}