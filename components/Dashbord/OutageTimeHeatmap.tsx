// components/OutageTimeHeatmap.tsx
'use client'

import { useState, useEffect } from 'react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { getOutageTimeHeatmap } from '@/app/api/action/dashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const OutageTimeHeatmap = () => {
  const [chartData, setChartData] = useState<any>({
    datasets: []
  });

  useEffect(() => {
    const fetchData = async () => {
      const data = await getOutageTimeHeatmap();
      const chartData = data.flatMap((row, hour) => 
        row.map((value, day) => ({ x: day, y: hour, r: value * 2 }))
      );

      setChartData({
        datasets: [{
          label: 'จำนวนคำขอดับไฟ',
          data: chartData,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        }]
      });
    };

    fetchData();
  }, []);

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    scales: {
      y: {
        type: 'linear',
        min: 0,
        max: 23,
        ticks: { stepSize: 1 },
        title: {
          display: true,
          text: 'เวลา (ชั่วโมง)',
        },
      },
      x: {
        type: 'linear',
        min: 0,
        max: 6,
        ticks: { 
          stepSize: 1,
          callback: function(value) {
            return ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][value as number];
          },
        },
        title: {
          display: true,
          text: 'วัน',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const day = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][context[0].parsed.x as number];
            return `วัน${day} เวลา ${context[0].parsed.y}:00 น.`;
          },
          label: function(context) {
            return `จำนวนคำขอ: ${(context.raw as any).r / 2}`;
          },
        }
      },
      title: {
        display: true,
        text: 'ช่วงเวลาที่มีการขอดับไฟบ่อยที่สุด',
      },
    },
  };

  return <Scatter options={options} data={chartData} />;
};

export default OutageTimeHeatmap;