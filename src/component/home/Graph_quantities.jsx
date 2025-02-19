import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

function GraphQuantities({ metric }) {
  if (!metric) return null;

  const workerNames = ["worker_cpu", "worker_gpu", "worker_user"];

  const cantWorker = workerNames.map((name) => ({
    name,
    cant: metric[name]?.cant || 0,
  }));

  const timeWorker = workerNames.map((name) => ({
    name,
    processing_time: (metric[name]?.processing_time || 0) / 1_000_000_000, // Convertir a segundos
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ textAlign: "center" }}>
        <h2>Cantidad de tareas procesadas por cada tipo de worker</h2>
        <div style={{ width: 400, height: 300, margin: "auto" }}>
          <ResponsiveContainer>
            <BarChart data={cantWorker}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cant" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <h2>Tiempo promedio de procesamiento por tipo de worker</h2>
        <div style={{ width: 400, height: 300, margin: "auto" }}>
          <ResponsiveContainer>
            <BarChart data={timeWorker}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `${value}s`} />
              <Tooltip formatter={(value) => `${value.toFixed(2)} s`} />
              <Bar dataKey="processing_time" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default GraphQuantities;

