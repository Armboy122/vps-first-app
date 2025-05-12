'use client'
import { getBranches, getWorkCenters } from '@/app/api/action/getWorkCentersAndBranches';
import { getDataforPrintAnnouncement } from '@/app/api/action/printAnnoucement';
import { GetAnnoucementRequest, GetAnnoucementRequestInput } from '@/lib/validations/powerOutageRequest';
import { faPrint } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { zodResolver } from '@hookform/resolvers/zod';
import { Branch } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getThailandDate } from "@/lib/date-utils";

interface WorkCenter {
    id: number;
    name: string;
  }

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
    const date = getThailandDate();
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function PrintAnnouncement(){
    const [workCenters,setWorkCenters] = useState<WorkCenter[]>([])
    const [isOpen,setIsOpen] = useState(false)
    const [branches, setBranches] = useState<Pick<Branch,"id"|"shortName"|"workCenterId">[]>([]);
    const [pdfBase64, setPdfBase64] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {data:session} = useSession();
    const [authInfo, setAuthInfo] = useState({
        isAdmin: false,
        isUser: false,
        isViewer: false,
        isManager: false,
        isSupervisor: false,
        isLoading: true,
        userWorkCenterId: session?.user?.workCenterId,
        userWorkCenterName: session?.user?.workCenterName,
        userbranch: session?.user?.branchName,
        userbranchID: session?.user?.branchId,
    });
    useEffect(() => {
        if (session) {
            setAuthInfo({
                isAdmin: session?.user?.role === "ADMIN",
                isUser: session?.user?.role === "USER",
                isViewer: session?.user?.role === "VIEWER",
                isManager: session?.user?.role === "MANAGER",
                isSupervisor: session?.user?.role === "SUPERVISOR",
                isLoading: false,
                userWorkCenterId: session?.user?.workCenterId,
                userWorkCenterName: session?.user?.workCenterName,
                userbranch: session?.user?.branchName,
                userbranchID: session?.user?.branchId,
            });
        }
    }, [session]);

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

    useEffect(()=>{
        const setWC = async()=>{
            const res = await getWorkCenters()
            setWorkCenters(res)
        }
        setWC()
    },[])
    
    const onSubmit = async (data: GetAnnoucementRequestInput) => {
        setIsLoading(true);
        setError(null);
        try {
            // ปรับปรุงข้อมูลที่จะส่งไปตามสิทธิ์ของผู้ใช้
            const submitData = authInfo.isAdmin ? data : {
                ...data,
                workCenterId: String(authInfo.userWorkCenterId),
                branchId: String(authInfo.userbranchID)
              };
    
            const res = await getDataforPrintAnnouncement(submitData)
            if(res.length == 0){
                setError('การไฟฟ้าที่คุณเลือกไม่มีการดับไฟในวันดังกล่าว');
                setIsLoading(false);
                return;
            }
            let peaNo = ''
            let tel = "-"
            res.forEach((val,i)=>{
                const regex = /(\d{2}-\d{6})/
                const d = val.transformerNumber.match(regex)
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
            const resPDF = await fetch(process.env.NEXT_PUBLIC_GENERATE_PDF as string,{
                method: "POST",
                body: JSON.stringify(obj)
            });
            const { msg, data: pdfData } = await resPDF.json();
            if (msg === "success") {
                setPdfBase64(pdfData);
            } else {
                throw new Error(msg || 'ไม่สามารถสร้าง PDF ได้');
            }
        } catch (error) {
            console.error('เกิดข้อผิดพลาด:', error);
            setError('เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsLoading(false);
        }
    }

    const handleReset = () => {
        reset();
        setPdfBase64(null);
        setError(null);
    }

    return (
        <div>
            <button onClick={()=>setIsOpen(true)} className="bg-blue-500 text-white p-2 rounded">
            <FontAwesomeIcon icon={faPrint} className="mr-2" />
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
                            {authInfo.isAdmin && (
                                <>
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
                                </>
                            )}
                            {!authInfo.isAdmin && (
                                <>
                                    <input type="hidden" {...register('workCenterId')} value={authInfo.userWorkCenterId} />
                                    <input type="hidden" {...register('branchId')} value={authInfo.userbranchID} />
                                </>
                            )}
                            <div className='mt-3 flex flex-row gap-3'>
                                {!pdfBase64 && !isLoading && 
                                    <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                                        สร้างเอกสาร
                                    </button>
                                }
                                {isLoading && 
                                    <div className="bg-blue-500 text-white p-2 rounded flex items-center">
                                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        กำลังโหลด...
                                    </div>
                                }
                                {pdfBase64 &&
                                    <button onClick={handleReset} className="bg-blue-500 text-white p-2 rounded">
                                        ล้าง
                                    </button>
                                }
                                {pdfBase64 && 
                                    <PdfModal pdfBase64={pdfBase64} />
                                }
                            </div>
                        </form>
                        {error && 
                            <div className="mt-3 text-red-500">
                                {error}
                            </div>
                        }
                    </div>
                </div>
            }
        </div>
    )
}

function PdfModal({ pdfBase64 }:{pdfBase64:string}) {
    const handlePrint = () => {
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(`
                <html>
                    <head>
                        <title>Print PDF</title>
                    </head>
                    <body style="margin:0;padding:0;">
                        <embed width="100%" height="100%" src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
                    </body>
                </html>
            `);
            newWindow.document.close();
            newWindow.focus();
            setTimeout(() => {
                newWindow.print();
                newWindow.close();
            }, 250);
        }
    };
    
    const handleSave = () => {
        const linkSource = `data:application/pdf;base64,${pdfBase64}`;
        const downloadLink = document.createElement("a");
        const fileName = "document.pdf";
        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.click();
    };

    const handleView = () => {
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(`
                <html>
                    <head>
                        <title>View PDF</title>
                    </head>
                    <body style="margin:0;padding:0;">
                        <embed width="100%" height="100%" src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
                    </body>
                </html>
            `);
        }
    };

    return (
        <div>
            <button onClick={handleView} className="bg-blue-500 text-white p-2 rounded">
                แสดงตัวอย่าง PDF
            </button>
            <button onClick={handlePrint} className="bg-green-500 text-white p-2 rounded ml-2">
                Print
            </button>
            <button onClick={handleSave} className="bg-yellow-500 text-white p-2 rounded ml-2">
                Save
            </button>
        </div>
    );
}