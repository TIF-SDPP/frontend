import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useAuth0 } from "@auth0/auth0-react";

export default function GpuWorker() {
  const [ws, setWs] = useState(null);
  const { user } = useAuth0();
  const workerIdRef = useRef(`worker-${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  async function processBlock(data) {
    let found = false;
    const startTime = performance.now();
    let hash = "";
    let randomNumber = "";

    while (!found) {
      randomNumber = (
        Math.floor(Math.random() * (data.random_end - data.random_start + 1)) +
        data.random_start
      ).toString();
      const combinedData = `${randomNumber}${data.base_string_chain}${data.blockchain_content}`;
      hash = enhancedHashGPU(combinedData);
      if (hash.toString().startsWith(data.prefix)) {
        found = true;
      }
    }
    const processingTime = (performance.now() - startTime) / 1000;
    return {
      ...data,
      hash,
      number: randomNumber,
      processing_time: processingTime,
      user_id: user.sub,
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

  function sendResult(data) {
    fetch("http://localhost:8090/solved_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.text())
      .then((text) => toast.success("Resultado enviado: " + text))
      .catch((err) => toast.error("Error enviando resultado: " + err));
  }

  function sendKeepAlive() {
    if (ws) {
      fetch("http://localhost:8092/keep_alive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerIdRef.current }),
      })
        .then((res) => res.text())
        .then((text) => console.log("Keep alive response:", text))
        .catch((err) => console.error("Error en keep_alive:", err));
    }
  }

  const handleWebSocketOpen = () => {
    const websocket = new WebSocket("ws://localhost:8888");

    websocket.onopen = () => {
      toast.success("Conectado al WebSocket");
      setWs(websocket);
    };

    websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      toast.info("Mensaje recibido: Procesando...");

      // Procesamos el bloque de datos sin esperar el resultado del keep alive
      const result = await processBlock(data);
      sendResult(result);
    };

    websocket.onerror = (error) => {
      toast.error("Error en WebSocket: " + error.message);
    };

    websocket.onclose = () => {
      toast.warn("Conexión WebSocket cerrada");
      setWs(null);
    };
  };

  const handleWebSocketClose = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  const handleButtonClick = () => {
    if (ws) {
      handleWebSocketClose();
    } else {
      handleWebSocketOpen();
    }
  };

  useEffect(() => {
    if (ws) {
      const interval = setInterval(() => {
        sendKeepAlive();
      }, 10000); // Se manda cada 10 segundos

      return () => clearInterval(interval);
    }
  }, [ws]); // Este effect se dispara cuando el WebSocket está activo

  return (
    <button
      onClick={handleButtonClick}
      style={{ padding: "10px", fontSize: "16px" }}
    >
      {ws ? "Worker end" : "Worker start"}
    </button>
  );
}
