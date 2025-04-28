"use client";

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

export const printSelectedRequests = (
  selectedRequests: number[],
  requests: PowerOutageRequest[]
) => {
  if (selectedRequests.length === 0) {
    alert("กรุณาเลือกรายการที่ต้องการพิมพ์");
    return;
  }

  // จัดกลุ่มข้อมูลตามวันที่
  const groupedRequests = selectedRequests.reduce((acc, id) => {
    const request = requests.find((r) => r.id === id);
    if (!request) return acc;

    const dateKey = request.outageDate.toISOString().split("T")[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(request);
    return acc;
  }, {} as Record<string, PowerOutageRequest[]>);

  // เรียงลำดับวันที่จากเก่าไปใหม่
  const sortedDates = Object.keys(groupedRequests).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // สร้าง HTML สำหรับข้อมูลที่เลือก
  const printContent = `
    <html>
      <head>
        <title>รายงานคำขอดับไฟ</title>
        <style>
          @font-face {
            font-family: 'THSarabunNew';
            src: url('data:font/truetype;base64,BASE64_ENCODED_FONT_DATA') format('truetype');
          }
          body { 
            font-family: 'THSarabunNew', sans-serif;
            position: relative;
            padding: 20px;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 50px;
            color: rgba(163, 187, 225, 0.3);
            z-index: -1;
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin-bottom: 20px; 
          }
          th, td { 
            border: 1px solid black; 
            padding: 8px; 
            text-align: left; 
          }
          h2 { 
            margin-top: 20px; 
          }
          @media print {
            .watermark {
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="watermark">ออกจากระบบคำขออนุมัติดับไฟ</div>
        <div class="header">
          <h1>รายงานคำขอดับไฟ</h1>
        </div>
        ${sortedDates
          .map(
            (date) => `
            <h2>วันที่ ${new Date(date).toLocaleDateString("th-TH")}</h2>
            <table>
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>หมายเลขหม้อแปลง</th>
                  <th>บริเวณ</th>
                </tr>
              </thead>
              <tbody>
                ${groupedRequests[date]
                  .map(
                    (request) => `
                    <tr>
                      <td>${request.startTime.toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} - 
                          ${request.endTime.toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}</td>
                      <td>${request.transformerNumber}</td>
                      <td>${request.area}</td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>
          `
          )
          .join("")}
      </body>
    </html>
  `;

  // เปิดหน้าต่างใหม่และพิมพ์
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();

    // รอให้เนื้อหาโหลดเสร็จก่อนพิมพ์
    printWindow.onload = () => {
      printWindow.print();
      // ปิดหน้าต่างหลังจากพิมพ์เสร็จ (อาจไม่ทำงานในบางเบราว์เซอร์)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  } else {
    alert(
      "ไม่สามารถเปิดหน้าต่างการพิมพ์ได้ โปรดตรวจสอบการตั้งค่า pop-up blocker ของเบราว์เซอร์"
    );
  }
}; 