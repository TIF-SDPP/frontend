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

/**
 * Cantidad mínima de ceros cuyos gráficos se dibujarán.
 */
const MIN_ZEROS = 1;

function GraphQuantities({ metric }) {
  if (!metric) return null;

  const workerNames = ["worker_cpu", "worker_user"];

  return (
    <div style={{ display: "flex", gap: "20px", overflow: "scroll" }}>
      {Object.entries(metric).map(([prefix, data]) => {
        if (prefix.length < MIN_ZEROS) return;
        const cantWorker = workerNames.map((name) => ({
          name,
          cant: data[name]?.cant || 0,
        }));

        const timeWorker = workerNames.map((name) => ({
          name,
          processing_time: data[name]?.processing_time || 0,
        }));

        return (
          <div key={prefix} style={{ border: "1px solid #ccc", height: "100%", padding: 20 }}>
            <h2 style={{ margin: 0, textAlign: "center" }}>
              Prefix: <code>{prefix}</code>
            </h2>

            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: 10 }}>Cantidad de tareas procesadas</h3>
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
              <h3 style={{ margin: 10 }}>Tiempo promedio de procesamiento</h3>
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
      })}
    </div>
  );
}

export default GraphQuantities;
