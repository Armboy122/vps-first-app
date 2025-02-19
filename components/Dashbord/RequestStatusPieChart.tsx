'use client'

import { Bar } from 'react-chartjs-2';
import { useState, useEffect } from 'react';

import {
 Chart as ChartJS,
 CategoryScale,
 LinearScale,
 BarElement,
 Title,
 Tooltip,
 Legend
} from 'chart.js';
import { getOMSStatusDistributionByWorkCenter } from '@/app/api/action/dashboard';

ChartJS.register(
 CategoryScale,
 LinearScale,
 BarElement,
 Title,
 Tooltip,
 Legend
);

const RequestStatusBarChart = () => {
 const [chartData, setChartData] = useState<any>({
   labels: [],
   datasets: []
 });

 useEffect(() => {
   const fetchData = async () => {
     const data = await getOMSStatusDistributionByWorkCenter();
     console.log(data);

     // Filter out work centers with no data
     const filteredData = data.filter(item => {
       const hasData = 
         item.PROCESSED_OVER_15_DAYS > 0 || 
         item.PROCESSED_8_TO_15_DAYS > 0 || 
         item.PROCESSED_6_TO_7_DAYS > 0 || 
         item.PROCESSED_1_TO_5_DAYS > 0 || 
         item.PROCESSED_OVERDUE > 0;
       return hasData;
     });

     setChartData({
       labels: filteredData.map(item => item.workCenterName),
       datasets: [
         {
           label: 'มากกว่า 15 วัน',
           data: filteredData.map(item => item.PROCESSED_OVER_15_DAYS),
           backgroundColor: 'rgba(75, 192, 192, 0.9)',
         },
         {
           label: '8-15 วัน',
           data: filteredData.map(item => item.PROCESSED_8_TO_15_DAYS),
           backgroundColor: 'rgba(54, 162, 235, 0.9)',
         },
         {
           label: '6-7 วัน',
           data: filteredData.map(item => item.PROCESSED_6_TO_7_DAYS),
           backgroundColor: 'rgba(255, 206, 86, 0.9)',
         },
         {
           label: '1-5 วัน',
           data: filteredData.map(item => item.PROCESSED_1_TO_5_DAYS),
           backgroundColor: 'rgba(255, 159, 64, 0.9)',
         },
         {
           label: 'เกินกำหนด',
           data: filteredData.map(item => item.PROCESSED_OVERDUE),
           backgroundColor: 'rgba(255, 99, 132, 0.9)',
         }
       ]
     });
   };

   fetchData();
 }, []);

 const options = {
   responsive: true,
   plugins: {
     legend: {
       position: 'top' as const,
     },
     title: {
       display: true,
       text: 'สถานะงานตามช่วงเวลาของแต่ละจุดรวมงาน',
       font: {
         size: 18
       }
     },
   },
   scales: {
     x: {
       ticks: {
         maxRotation: 45,
         minRotation: 45
       },
       grid: {
         offset: true
       }
     },
     y: {
       beginAtZero: true,
       title: {
         display: true,
         text: 'จำนวนงาน'
       }
     }
   },
   maintainAspectRatio: false,

 // Controls the percentage of the category width that bars take up
 // Controls the percentage of the available width each bar takes
 };

 return (
   <div style={{ height: '500px' }}>
     <Bar options={options} data={chartData} />
   </div>
 );
};

export default RequestStatusBarChart;