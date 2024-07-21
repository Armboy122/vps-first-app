import PrintAnnouncement from '@/components/PrintAnnouncement'
import prisma from '@/lib/prisma'


export default async function PowerOutageRequestPage() {

  const data = await prisma.workCenter.findMany()

  const request = await prisma.powerOutageRequest.findMany({
    select: {
      id: true,
      outageDate: true,
      workCenter: {
        select : {
          name: true
        }
      },
      branch: {
        select : {
          fullName: true
        }
      }
    }
  })

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">สร้างคำขอดับไฟใหม่</h1>
      <PrintAnnouncement workCenters={data} />
      {request.map(val=> {return (
        <div className='flex flex-row flex-wrap' key={val.id}>{val.outageDate.toDateString()}{val.branch.fullName}</div>
      )})}
    </div>
  )
}