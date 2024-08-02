// components/OMSStatusStackedChart.tsx
"use client";

import { Bar } from "react-chartjs-2";
import { useState, useEffect } from "react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { getOMSStatusByWorkCenter } from "@/app/api/action/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const OMSStatusStackedChart = () => {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      const data = await getOMSStatusByWorkCenter();
      setChartData({
        labels: data.map((item) => item.name),
        datasets: [
          {
            label: "รอดำเนินการ",
            data: data.map((item) => item.NOT_ADDED),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
          },
          {
            label: "ลงข้อมูลเรียบร้อย",
            data: data.map((item) => item.PROCESSED),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
          {
            label: "ยกเลิก",
            data: data.map((item) => item.CANCELLED),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
        ],
      });
    };

    fetchData();
  }, []);

  const options = {
    responsive: true,
    scales: {
      x: { stacked: true },
      y: { stacked: true },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
      },
    },
  };

  return <Bar options={options} data={chartData} />;
};

export default OMSStatusStackedChart;
