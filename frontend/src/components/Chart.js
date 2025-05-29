import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title);

const Chart = ({ probabilities }) => {
  if (!probabilities) return null;

  const data = {
    labels: ["開心", "難過", "憤怒", "中性", "驚訝"],
    datasets: [
      {
        label: "情緒機率",
        data: [
          probabilities.happy,
          probabilities.sad,
          probabilities.angry,
          probabilities.neutral,
          probabilities.surprised,
        ],
        backgroundColor: [
          "#4CAF50",
          "#F44336",
          "#FF9800",
          "#2196F3",
          "#9C27B0",
        ],
        borderColor: ["#388E3C", "#D32F2F", "#F57C00", "#1976D2", "#7B1FA2"],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
      },
    },
    plugins: {
      legend: { display: false },
      title: { display: true, text: "情緒辨識結果" },
    },
  };

  return (
    <div>
      <h3>情緒機率圖表</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

export default Chart;
