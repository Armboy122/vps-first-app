"use client";
import React, { useState } from "react";

interface ExcelImportGuideProps {
  role: string;
}

export const ExcelImportGuide: React.FC<ExcelImportGuideProps> = ({ role }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📚</span>
          <h3 className="text-lg font-semibold text-blue-800">
            คู่มือการใช้งานการนำเข้าข้อมูลจาก Excel
          </h3>
        </div>
        <button className="text-blue-600 hover:text-blue-800 transition-colors">
          {isOpen ? "🔽" : "▶️"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4 text-sm text-blue-700">
          
          {/* ขั้นตอนการใช้งาน */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
              <span className="mr-2">🚀</span>
              ขั้นตอนการใช้งาน
            </h4>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>คลิก &quot;📋 ดาวน์โหลดแม่แบบ&quot; เพื่อดาวน์โหลดไฟล์ตัวอย่าง</li>
              <li>เปิดไฟล์ CSV ที่ดาวน์โหลดด้วย Excel หรือ Google Sheets</li>
              <li>กรอกข้อมูลตามรูปแบบที่กำหนดไว้</li>
              <li>บันทึกไฟล์เป็น Excel (.xlsx)</li>
              <li>คลิก &quot;📂 เลือกไฟล์ Excel&quot; เพื่ออัปโหลดไฟล์</li>
              <li>ตรวจสอบผลลัพธ์และแก้ไขข้อผิดพลาด (ถ้ามี)</li>
              <li>คลิก &quot;บันทึกทั้งหมด&quot; เพื่อบันทึกข้อมูลเข้าระบบ</li>
            </ol>
          </div>

          {/* รูปแบบข้อมูล */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
              <span className="mr-2">📋</span>
              รูปแบบข้อมูลในไฟล์ Excel
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-gray-300">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1 text-left">คอลัมน์</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">รูปแบบ</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">ตัวอย่าง</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">วันที่ดับไฟ</td>
                    <td className="border border-gray-300 px-2 py-1">YYYY-MM-DD</td>
                    <td className="border border-gray-300 px-2 py-1">2024-12-15</td>
                    <td className="border border-gray-300 px-2 py-1 text-red-600">*จำเป็น ({'>'}10 วันจากวันนี้)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">เวลาเริ่มต้น</td>
                    <td className="border border-gray-300 px-2 py-1">ข้อความ</td>
                    <td className="border border-gray-300 px-2 py-1">08:00, 0800, 8:30</td>
                    <td className="border border-gray-300 px-2 py-1 text-red-600">*จำเป็น (06:00-19:30)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">เวลาสิ้นสุด</td>
                    <td className="border border-gray-300 px-2 py-1">ข้อความ</td>
                    <td className="border border-gray-300 px-2 py-1">12:00, 1200, 14:30</td>
                    <td className="border border-gray-300 px-2 py-1 text-red-600">*จำเป็น (≤20:00, +30นาที)</td>
                  </tr>
                  {role === "ADMIN" && (
                    <>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1 font-medium">จุดรวมงาน</td>
                        <td className="border border-gray-300 px-2 py-1">ชื่อจุดรวมงาน</td>
                        <td className="border border-gray-300 px-2 py-1">จุดรวมงานกรุงเทพ</td>
                        <td className="border border-gray-300 px-2 py-1 text-red-600">*จำเป็น (Admin เท่านั้น)</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1 font-medium">สาขา</td>
                        <td className="border border-gray-300 px-2 py-1">ชื่อสาขา</td>
                        <td className="border border-gray-300 px-2 py-1">สาขาลาดพร้าว</td>
                        <td className="border border-gray-300 px-2 py-1 text-red-600">*จำเป็น (Admin เท่านั้น)</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">หมายเลขหม้อแปลง</td>
                    <td className="border border-gray-300 px-2 py-1">ข้อความ</td>
                    <td className="border border-gray-300 px-2 py-1">TX001</td>
                    <td className="border border-gray-300 px-2 py-1 text-red-600">*จำเป็น (ตรวจสอบกับระบบ)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">สถานที่ติดตั้ง (GIS)</td>
                    <td className="border border-gray-300 px-2 py-1">ข้อความ</td>
                    <td className="border border-gray-300 px-2 py-1">หน้าโรงเรียนวัดใหม่</td>
                    <td className="border border-gray-300 px-2 py-1 text-green-600">เสริม (ดึงจากระบบได้)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">พื้นที่ไฟดับ</td>
                    <td className="border border-gray-300 px-2 py-1">ข้อความ</td>
                    <td className="border border-gray-300 px-2 py-1">หมู่บ้านเจริญสุข</td>
                    <td className="border border-gray-300 px-2 py-1 text-gray-600">เสริม</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* เคล็ดลับและข้อควรระวัง */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              เคล็ดลับและข้อควรระวัง
            </h4>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>รูปแบบวันที่:</strong> ใช้รูปแบบ YYYY-MM-DD (เช่น 2024-12-15) หรือให้ Excel จัดรูปแบบวันที่ให้อัตโนมัติ</li>
              <li><strong>เงื่อนไขวันที่:</strong> วันที่ดับไฟต้องมากกว่าวันปัจจุบันอย่างน้อย 10 วัน</li>
              <li><strong>รูปแบบเวลา:</strong> พิมพ์เป็นข้อความได้ เช่น &quot;08:00&quot;, &quot;0800&quot;, &quot;8:30&quot; หรือ &quot;14:15&quot;</li>
              <li><strong>เวลาทำการ:</strong> เวลาเริ่มต้น 06:00-19:30 น. และเวลาสิ้นสุดไม่เกิน 20:00 น.</li>
              <li><strong>ระยะเวลาขั้นต่ำ:</strong> เวลาดับไฟต้องมีระยะเวลาอย่างน้อย 30 นาที</li>
              {role === "ADMIN" && (
                <>
                  <li><strong>ชื่อจุดรวมงาน:</strong> ต้องตรงกับชื่อในระบบ (ไม่จำเป็นต้องตรงทุกตัวอักษร)</li>
                  <li><strong>ชื่อสาขา:</strong> ต้องอยู่ภายใต้จุดรวมงานที่ระบุ</li>
                </>
              )}
              <li><strong>หมายเลขหม้อแปลง:</strong> จะตรวจสอบกับระบบโดยอัตโนมัติ</li>
              <li><strong>สถานที่ติดตั้ง (GIS):</strong> หากไม่ใส่ จะดึงจากระบบตามหมายเลขหม้อแปลง</li>
              <li><strong>การบันทึกไฟล์:</strong> บันทึกเป็น .xlsx หรือ .xls เท่านั้น</li>
            </ul>
          </div>

          {/* ตัวอย่างข้อผิดพลาดที่พบบ่อย */}
          <div className="bg-white rounded-lg p-4 border border-red-100">
            <h4 className="font-semibold text-red-800 mb-3 flex items-center">
              <span className="mr-2">⚠️</span>
              ข้อผิดพลาดที่พบบ่อย
            </h4>
            <ul className="list-disc list-inside space-y-2 ml-4 text-red-700">
              <li><strong>วันที่ไม่ถูกต้อง:</strong> วันที่ต้องมากกว่าวันปัจจุบัน 10 วัน</li>
              <li><strong>ไม่พบหมายเลขหม้อแปลง:</strong> หมายเลขที่ระบุไม่มีในระบบ</li>
              <li><strong>ไม่พบจุดรวมงาน/สาขา:</strong> ชื่อที่ระบุไม่ตรงกับในระบบ (สำหรับ Admin)</li>
              <li><strong>ข้อมูลขาดหาย:</strong> ไม่ได้กรอกข้อมูลในคอลัมน์ที่จำเป็น</li>
              <li><strong>รูปแบบไฟล์ไม่ถูกต้อง:</strong> ไฟล์ไม่ใช่ Excel หรือเสียหาย</li>
            </ul>
          </div>

          {/* ติดต่อขอความช่วยเหลือ */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center">
              <span className="mr-2">🆘</span>
              ต้องการความช่วยเหลือ?
            </h4>
            <p className="text-green-700 text-sm">
              หากพบปัญหาหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมไอที หรือดูตัวอย่างไฟล์ Excel ที่ดาวน์โหลดได้
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 