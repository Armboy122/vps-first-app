// components/RequestsOverTimeChart.tsx
'use client'

import { Line } from 'react-chartjs-2';
import { useState, useEffect } from 'react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { getRequestsOverTime } from '@/app/api/action/dashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type Interval = 'daily' | 'weekly' | 'monthly';
type ChartData = {
  date: string;
  count: number;
};

const RequestsOverTimeChart = () => {
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      fill: boolean;
      borderColor: string;
      tension: number;
    }[];
  }>({
    labels: [],
    datasets: []
  });
  const [interval, setInterval] = useState<Interval>('daily');

  useEffect(() => {
    const fetchData = async () => {
      const data = await getRequestsOverTime(interval);
      setChartData({
        labels: data.map((item: ChartData) => item.date),
        datasets: [{
          label: 'จำนวนคำขอดับไฟ',
          data: data.map((item: ChartData) => item.count),
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      });
    };

    fetchData();
  }, [interval]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'จำนวนคำขอดับไฟตามเวลา',
      },
    },
  };

  return (
    <div>
      <div>
        <select 
          value={interval} 
          onChange={(e) => setInterval(e.target.value as Interval)}
          className="mb-4 p-2 border rounded"
        >
          <option value="daily">รายวัน</option>
          <option value="weekly">รายสัปดาห์</option>
          <option value="monthly">รายเดือน</option>
        </select>
      </div>
      <Line options={options} data={chartData} />
    </div>
  );
};

export default RequestsOverTimeChart;