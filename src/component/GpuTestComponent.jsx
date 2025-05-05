import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useAuth0 } from "@auth0/auth0-react";

export default function GpuWorker() {
  const { user } = useAuth0();
  const wsRef = useRef(null);
  const workerIdRef = useRef(`worker-${Math.random().toString(36).substring(7)}`);
  const [connected, setConnected] = useState(false);

  const COORDINADOR_HOST = import.meta.env.VITE_COORDINADOR_HOST;
  const POOL_MANAGER_HOST = import.meta.env.VITE_POOL_MANAGER_HOST;
  const WS_HOST = import.meta.env.VITE_WS_HOST || "wss://ws.unlucoin.info";

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (connected) {
      const interval = setInterval(sendKeepAlive, 10000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  function handleWebSocketOpen() {
    if (wsRef.current) return;
    const websocket = new WebSocket(WS_HOST);

    websocket.onopen = () => {
      toast.success("Conectado al WebSocket");
      wsRef.current = websocket;
      setConnected(true);
    };

    websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      toast.info("Mensaje recibido: Procesando...");
      const result = await processBlock(data, user.sub);
      sendResult(result);
    };

    websocket.onerror = (error) => {
      toast.error("Error en WebSocket");
      console.error("WebSocket Error:", error);
    };

    websocket.onclose = () => {
      toast.warn("Conexión WebSocket cerrada");
      wsRef.current = null;
      setConnected(false);
    };
  }

  function handleWebSocketClose() {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }

  function sendResult(data) {
    fetch(`${COORDINADOR_HOST}/solved_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.text())
      .then((text) => toast.success("Resultado enviado: " + text))
      .catch((err) => toast.error("Error enviando resultado: " + err));
  }

  function sendKeepAlive() {
    const data = {
      worker_id: workerIdRef.current,
      worker_user: "true",
      worker_type: "worker_user",
    };

    fetch(`${POOL_MANAGER_HOST}/keep_alive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.text())
      .then((text) => console.log("Keep alive response:", text))
      .catch((err) => console.error("Error en keep_alive:", err));
  }

  return (
    <div style={{ textAlign: "center" }}>
      <button
        onClick={connected ? handleWebSocketClose : handleWebSocketOpen}
        style={{ padding: "10px", fontSize: "16px" }}
      >
        {connected ? "Worker End" : "Worker Start"}
      </button>
      <div style={{ marginTop: "10px" }}>
        Estado: {connected ? "🟢 Conectado" : "🔴 Desconectado"}
      </div>
    </div>
  );
}

// Funciones utilitarias afuera
async function processBlock(data, userId) {
  let found = false;
  const startTime = performance.now();
  let hash = "";
  let randomNumber = "";

  while (!found) {
    randomNumber = (
      Math.floor(Math.random() * (data.random_end - data.random_start + 1)) + data.random_start
    ).toString();
    const combinedData = `${randomNumber}${data.base_string_chain}${data.blockchain_content}`;
    hash = enhancedHashGPU(combinedData);
    if (hash.startsWith(data.prefix)) {
      found = true;
    }
  }
  const processingTime = (performance.now() - startTime) / 1000;
  return {
    ...data,
    hash,
    number: randomNumber,
    processing_time: processingTime,
    user_id: userId,
    worker_user: "true",
    worker_type: "worker_user",
  };
}

function enhancedHashGPU(data) {
  let hashVal = 0;
  for (let i = 0; i < data.length; i++) {
    hashVal = (hashVal * 31 + data.charCodeAt(i)) % 2 ** 32;
    hashVal ^= ((hashVal << 13) | (hashVal >>> 19)) >>> 0;
    hashVal = (hashVal * 17) % 2 ** 32;
    hashVal = ((hashVal << 5) | (hashVal >>> 27)) >>> 0;
  }
  return hashVal.toString(16).padStart(8, "0");
}
