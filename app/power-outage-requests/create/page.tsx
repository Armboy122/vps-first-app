// app/power-outage-requests/create/page.tsx

import { getWorkCenters } from '../../api/action/powerOutageRequest'
import PowerOutageRequestForm from '../../../components/PowerOutageRequestForm'

export default async function CreatePowerOutageRequestPage() {
  const workCenters = await getWorkCenters()

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">สร้างคำขอดับไฟใหม่</h1>
      <PowerOutageRequestForm workCenters={workCenters} />
    </div>
  )
}