'use client'
import { getBranches } from '@/app/api/action/getWorkCentersAndBranches';
import { getDataforPrintAnnouncement } from '@/app/api/action/printAnnoucement';
import { GetAnnoucementRequest, GetAnnoucementRequestInput } from '@/lib/validations/powerOutageRequest';
import { zodResolver } from '@hookform/resolvers/zod';
import { Branch, WorkCenter } from '@prisma/client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Document, Page,  } from 'react-pdf'
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const getCutoffDate = (date : Date) => {
    const dayOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][date.getDay()];
    return `${dayOfWeek}ที่ ${date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`;
};

const getCutoffTime = (startTime:Date, endTime:Date) => {
    const start = setFormattedTime(startTime);
    const end = setFormattedTime(endTime);
    return `ตั้งแต่เวลา ${start} น. - ${end} น.`;
};

const setFormattedTime = (time:Date) => {
    const currentDate = time;
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getAnnounceDate = () => {
    const date = new Date();
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};


export default function PrintAnnouncement({workCenters}:{workCenters:WorkCenter[]}){
    const [isOpen,setIsOpen] = useState(false)
    const [branches, setBranches] = useState<Pick<Branch,"id"|"shortName"|"workCenterId">[]>([]);
    const [url,setURL] = useState<string>()

    const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<GetAnnoucementRequestInput>({
        resolver: zodResolver(GetAnnoucementRequest)
    });

    const watchWorkCenterId = watch('workCenterId');

    const loadBranches = async (workCenterId: number) => {
        const branchData = await getBranches(workCenterId);
        setBranches(branchData);
    };

    useEffect(() => {
        if (watchWorkCenterId) {
          loadBranches(Number(watchWorkCenterId));
        }
    }, [watchWorkCenterId]);
    

    const onSubmit = async (data: GetAnnoucementRequestInput) =>{
        const res = await getDataforPrintAnnouncement(data)
        if(res.length == 0){
            return window.alert(`การไฟฟ้าที่คุณเลือกไม่มีการดับไฟในวันดังกล่าว`)
        }
        let peaNo = ''
        let tel = "-"
        res.forEach((val,i)=>{
            const regex = /(\d{2}-\d{6})/
            const d = val.gisDetails.match(regex)
            tel = val.branch.phoneNumber?val.branch.phoneNumber:"-"
            peaNo = peaNo+`${(i+1).toFixed(0)}. หมายเลขหม้อแปลง ${d?d[0]:"-"} บริเวณ ${val.area} ${getCutoffTime(val.startTime,val.endTime)} \n`
        })
        const obj = {
            peaNo,
            name: res[0].branch.fullName,
            cutoffDate: getCutoffDate(res[0].outageDate),
            annouceDate: getAnnounceDate(),
            tel
        }
        const resPDF = await fetch( process.env.NEXT_PUBLIC_GENERATE_PDF as string,{
            method: "POST",
            body: JSON.stringify(obj)
        });
        const { msg } = await resPDF.json();
        if (msg == "error") {
            window.alert("ไม่สามารถ Download เอกสารได้ กรุณาลองใหม่อีกครั้ง");
            return;
        }

    
        const pdfBlob = Buffer.from(msg as string, "base64");
        const pdfUrl = URL.createObjectURL(
            new Blob([pdfBlob], { type: "application/pdf" }),
        );
        setURL(pdfUrl);
        return
    }

    const handleReset= ()=>{
        reset()
        setURL(undefined)
    }

    return (
        <div>
            <button onClick={()=>setIsOpen(true)} className="bg-blue-500 text-white p-2 rounded">
                พิมพ์ประกาศ
            </button>
            {isOpen && 
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-20">
                    <div className='bg-white p-4 rounded-lg shadow-lg w-3/4 overflow-auto relative '>
                        <button
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-4 py-2"
                            onClick={()=>setIsOpen(false)}
                        >
                            Close
                        </button>
                        <form onSubmit={handleSubmit(onSubmit)} className="mt-16">
                            <div>
                                <label htmlFor="outageDate" className="block mb-2">วันที่ดับไฟ:</label>
                                <input
                                    type="date"
                                    id="outageDate"
                                    {...register('outageDate')}
                                    className="w-full p-2 border rounded"
                                />
                                {errors.outageDate && <p className="text-red-500">{errors.outageDate.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="workCenterId" className="block mb-2">ศูนย์งาน:</label>
                                <select
                                    id="workCenterId"
                                    {...register('workCenterId')}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="">เลือกศูนย์งาน</option>
                                    {workCenters.map(wc => (
                                    <option key={wc.id} value={wc.id}>{wc.name}</option>
                                    ))}
                                </select>
                                {errors.workCenterId && <p className="text-red-500">{errors.workCenterId.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="branchId" className="block mb-2">สาขา:</label>
                                <select
                                    id="branchId"
                                    {...register('branchId')}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="">เลือกสาขา</option>
                                    {branches.map(branch=><option key={branch.id} value={branch.id}>{branch.shortName}</option>)}
                                </select>
                                {errors.branchId && <p className="text-red-500">{errors.branchId.message}</p>}
                            </div>
                            <div className='mt-3 flex flex-row gap-3'>
                                {!url && 
                                    <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                                        สร้างเอกสาร
                                    </button>
                                }
                                {url &&
                                    <button onClick={handleReset} className="bg-blue-500 text-white p-2 rounded">
                                        ล้าง
                                    </button>

                                }
                                {url && 
                                    <PdfModal url={url} />
                                }
                            </div>
                        </form>
                    </div>
                </div>
            }
        </div>
    )
}

function PdfModal({ url }:{url:string}) {
    const [isOpen,setIsOpen] = useState(true)
    const handlePrint = () => {
        if (url) {
            const printWindow = window.open(url, '_blank');
            if(printWindow){
                printWindow.addEventListener('load', () => {
                    printWindow.focus();
                    printWindow.print();
                });
            }
        }
      };
    
      const handleSave = () => {
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'document.pdf'; // ชื่อไฟล์ที่ต้องการบันทึก
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
      };

    return (
      <div>
        <button onClick={()=>setIsOpen(true)} className="bg-blue-500 text-white p-2 rounded">
            แสดงตัวอย่าง PDF
        </button>
        {isOpen && 
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-4 rounded-lg shadow-lg w-3/4 h-3/4 overflow-auto relative">
                    <button
                        className="absolute top-2 left-2 bg-red-500 text-white rounded-full px-4 py-2"
                        onClick={()=>handlePrint()}
                    >
                        Print
                    </button>
                    <button
                        className="absolute top-2 left-20 bg-red-500 text-white rounded-full px-4 py-2"
                        onClick={()=>handleSave()}
                    >
                        Save
                    </button>
                    <button
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-4 py-2"
                        onClick={()=>setIsOpen(false)}
                    >
                        Close
                    </button>
                    <div className="h-full mt-16 mx-auto" style={{ width: 794, height: 1123 }}>
                        <Document file={url} className="h-full">
                            <Page pageNumber={1} width={794}/>
                        </Document>
                    </div>
                </div>
            </div>
        }
      </div>
    );
  };