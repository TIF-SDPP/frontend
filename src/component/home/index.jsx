import React, { useEffect, useState } from "react";
import LoginButton from "../login/LoginButton";
import GraphQuantities from "./Graph_quantities";

const Home = () => {
  const COORDINADOR_HOST = import.meta.env.VITE_COORDINADOR_HOST;
  const [metric, setMetric] = useState(null);
  useEffect(() => {
    handleMetric();
  }, []);

  const handleMetric = async () => {
    try {
      const response = await fetch(`${COORDINADOR_HOST}/metrics`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.statusText}`);
      }

      const data = await response.json();
      setMetric(data.data);
    } catch (error) {
      console.error("Error en handleMetric:", error);
    }
  };

  return (
    <div style={{ boxSizing: "border-box", height: "100vh", overflow: "auto", padding: 20, width: "100vw" }}>
      <LoginButton />
      <GraphQuantities metric={metric} />
    </div>
  );
};

export default Home;
