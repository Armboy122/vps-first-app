// components/RequestStatusPieChart.tsx
'use client'

import { Pie } from 'react-chartjs-2';
import { useState, useEffect } from 'react';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { getRequestStatusDistribution } from '@/app/api/action/dashboard';

ChartJS.register(ArcElement, Tooltip, Legend);

const RequestStatusPieChart = () => {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: []
  });

  useEffect(() => {
    const fetchData = async () => {
      const data = await getRequestStatusDistribution();
      setChartData({
        labels: data.map(item => item.statusRequest),
        datasets: [{
          data: data.map(item => item._count),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
          ],
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
        text: 'สัดส่วนสถานะคำขอ',
      },
    },
  };

  return <Pie options={options} data={chartData} />;
};

export default RequestStatusPieChart;