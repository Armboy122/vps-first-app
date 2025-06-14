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
  ChartOptions,
} from "chart.js";
import { getOMSStatusByWorkCenter } from "@/app/api/action/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const OMSStatusStackedChart = () => {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getOMSStatusByWorkCenter();

        setChartData({
          labels: data.map((item) => item.name),
          datasets: [
            {
              label: "รอดำเนินการ",
              data: data.map((item) => item.NOT_ADDED),
              backgroundColor: "rgba(255, 193, 7, 0.8)",
              borderColor: "rgba(255, 193, 7, 1)",
              borderWidth: 1,
            },
            {
              label: "ลงข้อมูลเรียบร้อย",
              data: data.map((item) => item.PROCESSED),
              backgroundColor: "rgba(40, 167, 69, 0.8)",
              borderColor: "rgba(40, 167, 69, 1)",
              borderWidth: 1,
            },
            {
              label: "ยกเลิก",
              data: data.map((item) => item.CANCELLED),
              backgroundColor: "rgba(220, 53, 69, 0.8)",
              borderColor: "rgba(220, 53, 69, 1)",
              borderWidth: 1,
            },
          ],
        });
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          font: { size: 12 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        stacked: true,
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          precision: 0,
          font: { size: 12 },
        },
        title: {
          display: true,
          text: "จำนวนงาน",
          font: { size: 14, weight: "bold" },
        },
      },
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
          font: { size: 13 },
        },
      },
      title: {
        display: true,
        text: "สถานะงานตามจุดรวมงาน",
        font: { size: 18, weight: "bold" },
        padding: { top: 10, bottom: 30 },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#333",
        bodyColor: "#666",
        borderColor: "#ddd",
        borderWidth: 1,
        cornerRadius: 8,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || "";
            const value = context.parsed.y || 0;
            return `${label}: ${value} งาน`;
          },
        },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeOutQuad", // TypeScript will now check against the correct union
    },
    layout: {
      padding: { top: 5, right: 16, bottom: 16, left: 8 },
    },
  };

  return (
    <div className="relative h-[500px] w-full p-4 bg-white rounded-lg shadow-sm">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <Bar options={options} data={chartData} />
      )}
    </div>
  );
};

export default OMSStatusStackedChart;
