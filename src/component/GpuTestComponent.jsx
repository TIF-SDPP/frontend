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
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

    const websocket = new WebSocket(WS_HOST);

    websocket.onopen = () => {
      toast.success("🟢 Conectado al WebSocket");
      wsRef.current = websocket;
      setConnected(true);
    };

    websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      const result = await processBlockWithGPU(data, user.sub);
      sendResult(result);
    };

    websocket.onerror = (error) => {
      toast.error("❌ Error en WebSocket");
      console.error("WebSocket Error:", error);
    };

    websocket.onclose = () => {
      toast.warn("🔌 WebSocket desconectado");
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
      .then((text) => toast.success("✅ Resultado enviado: " + text))
      .catch((err) => toast.error("❌ Error enviando resultado: " + err));
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

async function processBlockWithGPU(data, userId) {
  const startTime = performance.now();
  const TIMEOUT = 20 * 60 * 1000; // 20 minutos
  toast.info("🔧 Procesando tarea...");

  if (!navigator.gpu) {
    toast.error("🚫 WebGPU no está disponible en este navegador. Utilizando CPU...");
    return await processWithCPU(data, userId);
  }
  
  const adapter = await navigator.gpu.requestAdapter();
  console.log("Adapter:", adapter);
  console.log("Adapter features:", Array.from(adapter.features));
  
  const device = await adapter.requestDevice();

  const ENTRY_SIZE = 128;
  const batch_size = 10000;  // Tamaño del lote

  const encoder = new TextEncoder(); // Codificador UTF-8
  const rangeSize = data.random_end - data.random_start;
  
  let found = false;
  let selectedNumber = "";
  let hash = "";
  let timeout = false;

  // Proceso por lotes
  for (let i = 0; i < rangeSize; i += batch_size) {
    const batchEnd = Math.min(i + batch_size, rangeSize);
    const randomNumbers = [];

    // Generar números aleatorios en el rango para el lote actual
    for (let j = i; j < batchEnd; j++) {
      const randomNum = Math.floor(Math.random() * (data.random_end - data.random_start + 1)) + data.random_start;
      randomNumbers.push(randomNum.toString());
    }

    // Combinar datos con los números generados
    const combinedData = randomNumbers.map(rn => `${rn}${data.base_string_chain}${data.blockchain_content}`);
    
    // Enviar a WebGPU para procesar este lote con el shader
    const inputs = new Uint32Array(batch_size * (ENTRY_SIZE / 4));

    for (let j = 0; j < randomNumbers.length; j++) {
      const encoded = encoder.encode(combinedData[j]);

      for (let k = 0; k < ENTRY_SIZE; k++) {
        const byte = encoded[k] || 0;
        const wordIndex = Math.floor(k / 4);
        const byteOffset = k % 4;
        inputs[j * (ENTRY_SIZE / 4) + wordIndex] |= byte << (8 * byteOffset);
      }
    }

    // Crear buffers para WebGPU
    const inputBuffer = device.createBuffer({
      size: inputs.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Uint32Array(inputBuffer.getMappedRange()).set(inputs);
    inputBuffer.unmap();

    const outputBuffer = device.createBuffer({
      size: batch_size * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const resultBuffer = device.createBuffer({
      size: batch_size * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read> input : array<u32>;
        @group(0) @binding(1) var<storage, read_write> output : array<u32>;

        const ENTRY_SIZE: u32 = 128u;

        fn enhanced_hash(offset: u32) -> u32 {
            var hash: u32 = 0u;
            var i: u32 = 0u;
            loop {
                if (i >= ENTRY_SIZE) { break; }

                let wordIndex: u32 = i / 4u;
                let byteOffset: u32 = (i % 4u) * 8u;
                let byte = (input[offset + wordIndex] >> byteOffset) & 0xFFu;

                if (byte == 0u) { break; }

                hash = (hash * 31u + byte) & 0xFFFFFFFFu;
                hash = hash ^ ((hash << 13u) | (hash >> 19u));
                hash = (hash * 17u) & 0xFFFFFFFFu;
                hash = ((hash << 5u) | (hash >> 27u)) & 0xFFFFFFFFu;
                i = i + 1u;
            }
            return hash;
        }

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            let i = GlobalInvocationID.x;
            let offset = i * (ENTRY_SIZE / 4u);
            output[i] = enhanced_hash(offset);
        }
      `,
    });

    const pipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: shaderModule,
        entryPoint: "main",
      },
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(batch_size / 64));
    pass.end();

    commandEncoder.copyBufferToBuffer(outputBuffer, 0, resultBuffer, 0, batch_size * 4);
    device.queue.submit([commandEncoder.finish()]);

    await resultBuffer.mapAsync(GPUMapMode.READ);
    const resultArray = new Uint32Array(resultBuffer.getMappedRange());

    // Verificar los hashes
    for (let k = 0; k < resultArray.length; k++) {
      const candidate = randomNumbers[k];
      const candidateHash = resultArray[k];
      const hexHash = candidateHash.toString(16).padStart(8, "0");

      if (hexHash.startsWith(data.prefix)) {
        found = true;
        selectedNumber = candidate.toString();
        hash = hexHash;
        break;
      }
    }

    resultBuffer.unmap();

    if (found) {
      const processingTime = (performance.now() - startTime) / 1000;

      return {
        ...data,
        timeout,
        hash,
        number: selectedNumber,
        processing_time: processingTime,
        user_id: userId,
        worker_user: "true",
        worker_type: "worker_user",
      };

    }

    if (performance.now() - startTime > TIMEOUT) {
      timeout = true

      return {
        ...data,
        timeout
      }
    }

  }

  toast.warn("No se encontro resultado para esta tarea en el rango")
}

// Si WebGPU no está disponible, usamos la CPU
async function processWithCPU(data, userId) {
  const startTime = performance.now();
  const TIMEOUT = 20 * 60 * 1000; // 20 minutos

  const chunkSize = 10000; // Tamaño del subrango
  let selectedNumber = "";
  let hash = "";
  let timeout = false;

  let currentStart = data.random_start;
  let currentEnd = data.random_end;

  let found = false;

  while (currentStart < currentEnd && !found) {
    const chunkEnd = Math.min(currentStart + chunkSize, currentEnd);

    for (let i = currentStart; i < chunkEnd; i++) {
      const randomNum = i;
      const combinedData = `${randomNum}${data.base_string_chain}${data.blockchain_content}`;
      const candidateHash = enhancedHashCPU(combinedData);

      if (candidateHash.startsWith(data.prefix)) {
        selectedNumber = randomNum.toString();
        hash = candidateHash;
        found = true;
        break;
      }

      if (performance.now() - startTime > TIMEOUT) {
        timeout = true;
        break;
      }
    }

    currentStart += chunkSize;

    // 🚨 Este respiro es clave
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const processingTime = (performance.now() - startTime) / 1000;

  return {
    ...data,
    timeout,
    hash,
    number: selectedNumber,
    processing_time: processingTime,
    user_id: userId,
    worker_user: "true",
    worker_type: "worker_user",
  };
}

function enhancedHashCPU(data) {
  let hashVal = 0;
  for (let i = 0; i < data.length; i++) {
    hashVal = (hashVal * 31 + data.charCodeAt(i)) % 2 ** 32;
    hashVal ^= ((hashVal << 13) | (hashVal >>> 19)) >>> 0;
    hashVal = (hashVal * 17) % 2 ** 32;
    hashVal = ((hashVal << 5) | (hashVal >>> 27)) >>> 0;
  }
  return hashVal.toString(16).padStart(8, "0");
}

















