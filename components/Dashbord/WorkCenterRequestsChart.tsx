// components/WorkCenterRequestsChart.tsx
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
  Legend,
} from 'chart.js';
import { getWorkCenterRequests } from '@/app/api/action/dashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const WorkCenterRequestsChart = () => {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: []
  });

  useEffect(() => {
    const fetchData = async () => {
      const data = await getWorkCenterRequests();
      setChartData({
        labels: data.map(item => item.name),
        datasets: [{
          label: 'จำนวนคำขอดับไฟ',
          data: data.map(item => item._count.powerOutageRequests),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        }]
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

      },
    },
  };

  return <Bar options={options} data={chartData} />;
};

export default WorkCenterRequestsChart;