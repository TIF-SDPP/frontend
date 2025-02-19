import React, { useEffect, useState } from "react";
import LoginButton from "../login/LoginButton";
import Graph_quantities from "./Graph_quantities";

const Home = () => {
  const [metric, setMetric] = useState(null);
  useEffect(() => {
    handleMetric();
  }, []);

  const handleMetric = async () => {
    try {
      const response = await fetch(`http://localhost:8090/metrics/`, {
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
    <>
      <LoginButton />
      <Graph_quantities metric={metric} />
    </>
  );
};

export default Home;
