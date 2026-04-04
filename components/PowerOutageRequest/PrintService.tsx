"use client";

import { ActionFeedbackState } from "./ActionFeedback";

// เพิ่ม type สำหรับ html2pdf
declare global {
  interface Window {
    html2pdf: any;
  }
}

// ตัวแปรกำหนดขนาดตัวอักษร - สามารถปรับได้ตามต้องการ
const FONT_SIZES = {
  // ขนาดพื้นฐาน
  base: 12,

  // หัวเรื่อง
  mainTitle: 20,
  subTitle: 12,
  sectionTitle: 14,
  dateTitle: 13,

  // ตาราง
  tableHeader: 12,
  tableContent: 12,

  // รายละเอียด
  infoLabel: 12,
  infoContent: 12,
  summary: 10,
  note: 10,
  footer: 8,

  // Watermark
  watermark: 60,
};

// CSS สำหรับการแสดงผลภาษาไทยที่ดี
const THAI_FONT_CSS = `
  font-feature-settings: "liga" 1, "kern" 1, "calt" 1;
  -webkit-font-feature-settings: "liga" 1, "kern" 1, "calt" 1;
  -moz-font-feature-settings: "liga" 1, "kern" 1, "calt" 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-variant-ligatures: common-ligatures;
  unicode-bidi: embed;
  direction: ltr;
`;

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

// ฟังก์ชันโหลด html2pdf script
const loadHtml2Pdf = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load html2pdf.js"));
    document.head.appendChild(script);
  });
};

// ฟังก์ชันสร้าง HTML content สำหรับ PDF
const createPdfContent = (
  sortedDates: string[],
  groupedRequests: Record<string, PowerOutageRequest[]>,
) => {
  return `
    <div style="font-family: 'Noto Sans Thai', 'IBM Plex Sans Thai', 'Prompt', 'Sarabun', 'TH Sarabun New', sans-serif; position: relative; padding: 30px; font-size: ${FONT_SIZES.base}px; line-height: 1.5; ${THAI_FONT_CSS}">
      
      <!-- Watermark -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: ${FONT_SIZES.watermark}px; color: rgba(180, 180, 180, 0.08); z-index: -1; pointer-events: none; font-weight: 300; ${THAI_FONT_CSS}">
        ระบบคำขออนุมัติดับไฟ
      </div>
      
      <!-- Header องค์กร -->
      <div style="text-align: center; margin-bottom: 35px;">
        <!-- กรอบหัวเรื่อง -->
        <div style="border: 3px double #000; padding: 20px; margin-bottom: 20px; background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);">
          <div style="border: 1px solid #333; padding: 15px;">
            <h1 style="margin: 0; font-size: ${FONT_SIZES.mainTitle}px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 1.2px; font-family: 'Noto Sans Thai', 'IBM Plex Sans Thai', sans-serif; word-spacing: 0.2em; line-height: 1.2; text-rendering: geometricPrecision; -webkit-text-size-adjust: 100%;">
              รายงานคำขอดับไฟ
            </h1>
            <div style="width: 60px; height: 2px; background: #000; margin: 10px auto;"></div>
            <h2 style="margin: 8px 0 0 0; font-size: ${FONT_SIZES.subTitle}px; font-weight: 400; color: #555; letter-spacing: 0.8px; ${THAI_FONT_CSS}">
              POWER OUTAGE REQUEST REPORT
            </h2>
          </div>
        </div>
        
        <!-- ข้อมูลเอกสาร -->
        <div style="text-align: left; margin: 20px 0; background: #f9f9f9; padding: 15px; border-left: 4px solid #333;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 200px; font-weight: 600; padding: 6px 0; font-size: ${FONT_SIZES.infoLabel}px; color: #333; ${THAI_FONT_CSS}">วันที่ออกรายงาน:</td>
              <td style="border-bottom: 1px dotted #666; padding: 6px 12px; font-size: ${FONT_SIZES.infoContent}px; font-weight: 500; ${THAI_FONT_CSS}">${new Date().toLocaleDateString(
                "th-TH",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; padding: 6px 0; font-size: ${FONT_SIZES.infoLabel}px; color: #333; ${THAI_FONT_CSS}">เวลาที่ออกรายงาน:</td>
              <td style="border-bottom: 1px dotted #666; padding: 6px 12px; font-size: ${FONT_SIZES.infoContent}px; font-weight: 500; ${THAI_FONT_CSS}">${new Date().toLocaleTimeString(
                "th-TH",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                },
              )} น.</td>
            </tr>
            <tr>
              <td style="font-weight: 600; padding: 6px 0; font-size: ${FONT_SIZES.infoLabel}px; color: #333; ${THAI_FONT_CSS}">จำนวนรายการทั้งหมด:</td>
              <td style="border-bottom: 1px dotted #666; padding: 6px 12px; font-weight: 700; font-size: ${FONT_SIZES.infoContent}px; color: #d32f2f; ${THAI_FONT_CSS}">${Object.values(groupedRequests).flat().length} รายการ</td>
            </tr>
          </table>
        </div>
      </div>
      
      <!-- เนื้อหารายงาน -->
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: ${FONT_SIZES.sectionTitle}px; font-weight: 600; margin-bottom: 20px; color: #000; border-bottom: 3px solid #000; padding-bottom: 8px; background: linear-gradient(90deg, #f5f5f5 0%, transparent 100%); padding-left: 15px; ${THAI_FONT_CSS}">
          📋 รายละเอียดคำขอดับไฟ
        </h3>
        
        ${sortedDates
          .map(
            (date, dateIndex) => `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
              <!-- หัวข้อวันที่ -->
              <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 12px 20px; margin: 25px 0 15px 0; border-radius: 8px 8px 0 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="margin: 0; font-size: ${FONT_SIZES.dateTitle}px; font-weight: 600; ${THAI_FONT_CSS}">
                  📅 ${dateIndex + 1}. วันที่ ${new Date(
                    date,
                  ).toLocaleDateString("th-TH", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h4>
              </div>
              
              <!-- ตารางข้อมูล -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 0 0 8px 8px; overflow: hidden;">
                <thead>
                  <tr style="background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%);">
                    <th style="border: 1px solid #7f8c8d; padding: 12px 8px; text-align: center; font-weight: 600; font-size: ${FONT_SIZES.tableHeader}px; width: 8%; color: #2c3e50; ${THAI_FONT_CSS}">ลำดับ</th>
                    <th style="border: 1px solid #7f8c8d; padding: 12px 8px; text-align: center; font-weight: 600; font-size: ${FONT_SIZES.tableHeader}px; width: 18%; color: #2c3e50; ${THAI_FONT_CSS}">⏰ เวลาดับไฟ</th>
                    <th style="border: 1px solid #7f8c8d; padding: 12px 8px; text-align: center; font-weight: 600; font-size: ${FONT_SIZES.tableHeader}px; width: 20%; color: #2c3e50; ${THAI_FONT_CSS}">🔌 หมายเลขหม้อแปลง</th>
                    <th style="border: 1px solid #7f8c8d; padding: 12px 8px; text-align: center; font-weight: 600; font-size: ${FONT_SIZES.tableHeader}px; width: 54%; color: #2c3e50; ${THAI_FONT_CSS}">📍 บริเวณที่ดับไฟ</th>
                  </tr>
                </thead>
                <tbody>
                  ${groupedRequests[date]
                    .map(
                      (request, index) => `
                      <tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f8f9fa"}; transition: background-color 0.2s;">
                        <td style="border: 1px solid #bdc3c7; padding: 10px 8px; text-align: center; font-size: ${FONT_SIZES.tableContent}px; font-weight: 600; vertical-align: top; color: #2c3e50; ${THAI_FONT_CSS}">
                          ${index + 1}
                        </td>
                        <td style="border: 1px solid #bdc3c7; padding: 10px 8px; text-align: center; font-size: ${FONT_SIZES.tableContent}px; vertical-align: top; color: #27ae60; font-weight: 500; ${THAI_FONT_CSS}">
                          <div style="font-weight: 600;">${request.startTime.toLocaleTimeString(
                            "th-TH",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}</div>
                          <div style="color: #7f8c8d; font-size: 12px;">ถึง</div>
                          <div style="font-weight: 600;">${request.endTime.toLocaleTimeString(
                            "th-TH",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}</div>
                        </td>
                        <td style="border: 1px solid #bdc3c7; padding: 10px 8px; text-align: center; font-size: ${FONT_SIZES.tableContent}px; font-weight: 600; vertical-align: top; color: #8e44ad; ${THAI_FONT_CSS}">
                          ${request.transformerNumber}
                        </td>
                        <td style="border: 1px solid #bdc3c7; padding: 10px 12px; font-size: ${FONT_SIZES.tableContent}px; vertical-align: top; word-wrap: break-word; word-break: break-all; line-height: 1.5; color: #2c3e50; font-family: 'Noto Sans Thai', 'IBM Plex Sans Thai', 'Prompt', sans-serif; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; white-space: normal; overflow-wrap: break-word;">
                          ${
                            (request.area || "ไม่ระบุพื้นที่").length > 120
                              ? (request.area || "ไม่ระบุพื้นที่").substring(
                                  0,
                                  120,
                                ) + "..."
                              : request.area || "ไม่ระบุพื้นที่"
                          }
                        </td>
                      </tr>
                    `,
                    )
                    .join("")}
                </tbody>
              </table>
              
              <!-- สรุปรายการต่อวัน -->
              <div style="text-align: right; margin: 10px 0; padding: 8px 15px; background: #ecf0f1; border-left: 4px solid #3498db; border-radius: 4px;">
                <span style="font-size: ${FONT_SIZES.summary}px; color: #2c3e50; font-weight: 600; ${THAI_FONT_CSS}">
                  📊 รวม ${groupedRequests[date].length} รายการ ในวันที่ ${new Date(date).toLocaleDateString("th-TH")}
                </span>
              </div>
            </div>
          `,
          )
          .join("")}
      </div>
      
      <!-- Footer และข้อมูลเพิ่มเติม -->
      <div style="margin-top: 50px; page-break-inside: avoid;">
        <!-- เส้นแบ่ง -->
        <div style="border-top: 3px double #000; padding-top: 20px; margin-bottom: 20px;"></div>
        
        <!-- สรุปรวม -->
        <div style="background: linear-gradient(135deg, #f1f2f6 0%, #ddd 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid #2c3e50;">
          <h4 style="margin: 0 0 10px 0; font-size: ${FONT_SIZES.sectionTitle}px; color: #2c3e50; font-weight: 600; ${THAI_FONT_CSS}">📈 สรุปภาพรวม</h4>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 5px 0; font-size: ${FONT_SIZES.summary}px; color: #555; ${THAI_FONT_CSS}">
                <strong>🗓️ จำนวนวันที่มีการดับไฟ:</strong> ${sortedDates.length} วัน
              </p>
              <p style="margin: 5px 0; font-size: ${FONT_SIZES.summary}px; color: #555; ${THAI_FONT_CSS}">
                <strong>⚡ จำนวนรายการทั้งหมด:</strong> ${Object.values(groupedRequests).flat().length} รายการ
              </p>
            </div>
          </div>
        </div>
        
        <!-- หมายเหตุ -->
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: ${FONT_SIZES.note}px; font-weight: 600; color: #856404; ${THAI_FONT_CSS}">⚠️ หมายเหตุสำคัญ:</p>
          <ul style="margin: 8px 0 0 20px; padding: 0; color: #856404;">
            <li style="margin: 3px 0; font-size: ${FONT_SIZES.note}px; ${THAI_FONT_CSS}">รายงานนี้สร้างจากระบบคำขออนุมัติดับไฟอัตโนมัติ</li>
            <li style="margin: 3px 0; font-size: ${FONT_SIZES.note}px; ${THAI_FONT_CSS}">ข้อมูลถูกต้อง ณ วันที่ ${new Date().toLocaleDateString("th-TH")}</li>
            <li style="margin: 3px 0; font-size: ${FONT_SIZES.note}px; ${THAI_FONT_CSS}">กรุณาตรวจสอบความถูกต้องก่อนการใช้งาน</li>
          </ul>
        </div>
        
        <!-- Footer สุดท้าย -->
        <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #bbb;">
          <p style="margin: 0; font-size: ${FONT_SIZES.footer}px; color: #666; ${THAI_FONT_CSS}">
            🖥️ เอกสารนี้สร้างโดยระบบอัตโนมัติ | 📅 สร้างเมื่อ ${new Date().toLocaleString("th-TH")}
          </p>
          <p style="margin: 5px 0 0 0; font-size: ${FONT_SIZES.footer - 1}px; color: #999; ${THAI_FONT_CSS}">
            ระบบคำขออนุมัติดับไฟ - Power Outage Request System
          </p>
        </div>
      </div>
    </div>
  `;
};

// ฟังก์ชันแสดง Preview Modal
const showPdfPreview = (htmlContent: string, filename: string) => {
  // สร้าง modal overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  // สร้าง modal content
  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 900px;
    height: 90%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  `;

  // สร้าง header
  const header = document.createElement("div");
  header.style.cssText = `
    padding: 20px 25px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border-radius: 12px 12px 0 0;
  `;

  const title = document.createElement("h3");
  title.textContent = "ตัวอย่าง PDF - รายงานคำขอดับไฟ";
  title.style.cssText = `
    margin: 0;
    font-size: 20px;
    font-weight: bold;
    color: #1f2937;
  `;

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    padding: 5px 10px;
    border-radius: 6px;
    transition: all 0.2s;
  `;
  closeBtn.onmouseover = () => (closeBtn.style.background = "#fee2e2");
  closeBtn.onmouseout = () => (closeBtn.style.background = "none");

  header.appendChild(title);
  header.appendChild(closeBtn);

  // สร้าง preview area
  const previewArea = document.createElement("div");
  previewArea.style.cssText = `
    flex: 1;
    overflow: auto;
    padding: 20px;
    background: #f3f4f6;
  `;

  const previewContent = document.createElement("div");
  previewContent.style.cssText = `
    background: white;
    max-width: 210mm;
    margin: 0 auto;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
  `;
  previewContent.innerHTML = htmlContent;

  previewArea.appendChild(previewContent);

  // สร้าง footer buttons
  const footer = document.createElement("div");
  footer.style.cssText = `
    padding: 20px 25px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: #f8fafc;
    border-radius: 0 0 12px 12px;
  `;

  const printBtn = document.createElement("button");
  printBtn.textContent = "🖨️ พิมพ์";
  printBtn.style.cssText = `
    background: #059669;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  `;
  printBtn.onmouseover = () => (printBtn.style.background = "#047857");
  printBtn.onmouseout = () => (printBtn.style.background = "#059669");

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "❌ ปิด";
  cancelBtn.style.cssText = `
    background: #6b7280;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  `;
  cancelBtn.onmouseover = () => (cancelBtn.style.background = "#4b5563");
  cancelBtn.onmouseout = () => (cancelBtn.style.background = "#6b7280");

  // Event handlers
  const closeModal = () => document.body.removeChild(overlay);

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  overlay.onclick = (e) => e.target === overlay && closeModal();

  printBtn.onclick = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>รายงานคำขอดับไฟ</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
              body { margin: 0; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>${htmlContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
    closeModal();
  };

  // Assemble modal
  footer.appendChild(printBtn);
  footer.appendChild(cancelBtn);

  modal.appendChild(header);
  modal.appendChild(previewArea);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Focus management
  printBtn.focus();
};

export const printSelectedRequests = async (
  selectedRequests: number[],
  requests: PowerOutageRequest[],
) : Promise<ActionFeedbackState> => {
  if (selectedRequests.length === 0) {
    return {
      variant: "warning",
      title: "ยังไม่ได้เลือกรายการสำหรับพิมพ์",
      message: "เลือกรายการอย่างน้อย 1 รายการก่อนสร้างเอกสารสรุป",
    };
  }

  try {
    // โหลด html2pdf library
    await loadHtml2Pdf();

    // จัดกลุ่มข้อมูลตามวันที่
    const groupedRequests = selectedRequests.reduce(
      (acc, id) => {
        const request = requests.find((r) => r.id === id);
        if (!request) return acc;

        const dateKey = request.outageDate.toISOString().split("T")[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(request);
        return acc;
      },
      {} as Record<string, PowerOutageRequest[]>,
    );

    // เรียงลำดับวันที่จากเก่าไปใหม่
    const sortedDates = Object.keys(groupedRequests).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    // เพิ่ม Google Fonts สำหรับภาษาไทย
    const existingLink = document.querySelector(
      'link[href*="fonts.googleapis.com"]',
    );
    if (!existingLink) {
      const link = document.createElement("link");
      link.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Prompt:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap";
      link.rel = "stylesheet";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);

      // รอให้ font โหลดเสร็จ - เพิ่มเวลาสำหรับ Thai fonts
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // ตรวจสอบว่า font โหลดเสร็จแล้วหรือยัง
      try {
        await document.fonts.ready;
      } catch (error) {
        console.warn("Font loading check failed, proceeding anyway");
      }
    }

    // สร้าง HTML content
    const htmlContent = createPdfContent(sortedDates, groupedRequests);

    // สร้างชื่อไฟล์
    const filename = `รายงานคำขอดับไฟ_${new Date().toLocaleDateString("th-TH").replace(/\//g, "-")}.pdf`;

    // แสดง preview modal
    showPdfPreview(htmlContent, filename);
    return {
      variant: "success",
      title: "เปิดตัวอย่าง PDF แล้ว",
      message:
        "ตรวจสอบข้อมูลในหน้าต่างตัวอย่าง จากนั้นกดพิมพ์เอกสารได้ทันที",
    };
  } catch (error) {
    console.error("Error generating PDF preview:", error);
    return {
      variant: "error",
      title: "สร้างตัวอย่าง PDF ไม่สำเร็จ",
      message:
        "ระบบไม่สามารถสร้างตัวอย่างเอกสารได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
};
