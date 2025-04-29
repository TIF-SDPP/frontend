import { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "react-toastify";
import { fetchPost } from "../../tools/useFetch";
import './css/LeftTable.css';

const LeftOption = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [user_id, setUser_id] = useState("");
  const [amount, setAmount] = useState("");
  const privateKeyRef = useRef(null);
  const { user, getAccessTokenSilently } = useAuth0();
  const [balance, setBalance] = useState("");
  const prevBalanceRef = useRef(balance);
  const COORDINADOR_HOST = import.meta.env.VITE_COORDINADOR_HOST;

  useEffect(() => {
    if (user) {
      checkOrCreateKeyPair(user.sub);
      handleBalance(); // llamada inicial
  
      const intervalId = setInterval(() => {
        handleBalance(); // llamada periódica
      }, 10000); // cada 10 segundos (10000ms)
  
      return () => clearInterval(intervalId); // limpieza al desmontar
    }
  }, [user]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const privateKeyJwk = JSON.parse(event.target.result);
        const importedKey = await window.crypto.subtle.importKey(
          "jwk",
          privateKeyJwk,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["sign"]
        );
        privateKeyRef.current = importedKey;
        toast.success("Clave privada cargada correctamente ✅");
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar la clave privada");
    }
  };

  const handleSubmit = async () => {
    if (!privateKeyRef.current) {
      toast.error("Debe cargar su clave privada antes de enviar");
      return;
    }
    if (!user_id || !amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error("Complete todos los campos correctamente");
      return;
    }
  
    try {
      const accessToken = import.meta.env.VITE_TOKEN;
      const response = await fetch(`https://blockchainsd.us.auth0.com/api/v2/users/${user_id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
  
      const urlPost = `${COORDINADOR_HOST}/transaction`;
      const message = `${user.sub}-${user_id}-${amount}`;
      const signature = await signTransaction(privateKeyRef.current, message);
  
      const request = {
        user_from: user.sub,
        user_to: user_id,
        amount,
        signature,
        message,
      };

      const data = await fetchPost(urlPost, request);

      if (data.status) {
        toast.success("Transferencia enviada ✅");
        setShowPopup(false);
        setAmount("");
        setUser_id("");
      } else {
        toast.error("Error en la transferencia: " + (data.data || "Error desconocido"));
      }
    } catch (error) {
      console.error(error);
      toast.error(`Error en la transferencia: ${error.message || "desconocido"}`);
    }
  };

  const handleBalance = async () => {
    if (!user) return;
  
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(
        `${COORDINADOR_HOST}/balance/${user.sub}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.statusText}`);
      }
  
      const data = await response.json();
      const previousBalance = prevBalanceRef.current; // 🔥 leo el último balance manual
      const newBalance = data.balance;
  
      if (newBalance !== previousBalance) {
        const delta = newBalance - previousBalance;
        const message = delta > 0
          ? `💰 ¡Te llegaron $${delta}!`
          : `📉 Gastaste $${Math.abs(delta)}`;
  
        toast.info(message);
      }
  
      setBalance(newBalance);
      prevBalanceRef.current = newBalance; // 🔥 actualizo el ref manualmente
  
    } catch (error) {
      console.error("Error en handleBalance:", error);
    }
  };
  

  const checkOrCreateKeyPair = async (userId) => {
    const token = await getAccessTokenSilently();

    const checkResponse = await fetch(`${COORDINADOR_HOST}/key_exists/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { exists } = await checkResponse.json();
    if (exists) return;

    console.log(exists);

    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"]
    );

    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

    const response = await fetch(`${COORDINADOR_HOST}/register_key`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        public_key: publicKeyJwk,
      }),
    });

    if (response.ok) {
      const blob = new Blob([JSON.stringify(privateKeyJwk)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clave-privada-${userId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Clave privada generada y descargada. Guardala bien.");
    }
  };

  const signTransaction = async (key, message) => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);
    const signature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      key,
      encoded
    );

    return arrayBufferToBase64(signature);
  };

  const arrayBufferToBase64 = (buffer) => {
    return btoa(
      Array.from(new Uint8Array(buffer))
        .map((b) => String.fromCharCode(b))
        .join("")
    );
  };

  return (
    <>
      <div className="balance-display">${balance}</div>
      <div className="transfer-button" onClick={() => setShowPopup(true)}>
        Transferencia
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>Transferencia</h2>

            <label>
              user_id:
              <input
                type="text"
                value={user_id}
                onChange={(e) => setUser_id(e.target.value)}
              />
            </label>

            <label>
              Monto:
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label>
              Clave Privada:
              <input type="file" accept=".json" onChange={handleFileUpload} />
            </label>

            <button onClick={handleSubmit}>Enviar</button>
            <button onClick={() => setShowPopup(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
};

export default LeftOption;
