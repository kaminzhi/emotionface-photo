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
    labels: ["憤怒", "厭惡", "恐懼", "開心", "難過", "中性", "驚訝"],
    datasets: [
      {
        label: "情緒機率",
        data: [
          probabilities.angry,
          probabilities.disgust,
          probabilities.fear,
          probabilities.happy,
          probabilities.sad,
          probabilities.neutral,
          probabilities.surprise,
        ],
        backgroundColor: [
          "#F44336", // angry
          "#8BC34A", // disgust
          "#FF9800", // fear
          "#4CAF50", // happy
          "#2196F3", // sad
          "#9E9E9E", // neutral
          "#E91E63", // surprise
        ],
        borderColor: [
          "#D32F2F",
          "#689F38",
          "#F57C00",
          "#388E3C",
          "#1976D2",
          "#616161",
          "#C2185B",
        ],
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
