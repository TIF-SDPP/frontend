import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "react-toastify";
import { fetchPost } from "../../tools/useFetch";

const LeftOption = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [user_id, setUser_id] = useState("");
  const [amount, setAmount] = useState("");
  const { user, getAccessTokenSilently } = useAuth0();
  const [balance, setBalance] = useState("");
  const COORDINADOR_HOST = import.meta.env.VITE_COORDINADOR_HOST;

  useEffect(() => {
    if (user) {
      checkOrCreateKeyPair(user.sub);
    }
    handleBalance();
  }, []);

  const handleSubmit = async () => {
    let response;
    try {
      const accessToken = import.meta.env.VITE_TOKEN;
  
      response = await fetch(
        `https://blockchainsd.us.auth0.com/api/v2/users/${user_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      toast.error("El usuario no existe");
      return;
    }
  
    try {
      const urlPost = `${COORDINADOR_HOST}/transaction`;
      const message = `${user.sub}-${user_id}-${amount}`;
      console.log("Mensaje para firmar:", message);
      const signature = await signTransaction(user.sub, message);
      console.log("Firma generada:", signature);

      const request = {
        user_from: user.sub,
        user_to: user_id,
        amount: amount,
        signature: signature,
        message: message
      };
    
      console.log("Transacción enviada:", request);

      const postResponse = fetchPost(urlPost, request);
      console.log(postResponse);
  
      setShowPopup(false);
    } catch (error) {
      toast.error("Error en la transferencia");
      return;
    }
  };
  
  const handleBalance = async () => {
    try {
      const token = await getAccessTokenSilently();

      if (!token) {
        console.error("Error: No se pudo obtener el token de acceso.");
        return;
      }
      console.log(token);

      console.log("Token obtenido correctamente");

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
      console.log("Balance recibido:", data);
      setBalance(data.balance);
    } catch (error) {
      console.error("Error en handleBalance:", error);
    }
  };

  const checkOrCreateKeyPair = async (userId) => {
    const existing = localStorage.getItem(`privateKey-${userId}`);
    if (existing) {
      console.log("✅ Ya existe un par de claves para este usuario");
      //return;
    }

    const token = await getAccessTokenSilently();

    // Generar clave nueva
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"]
    );
  
    // Exportar la clave privada (en formato JSON Web Key)
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    console.log("Clave pública generada:", publicKeyJwk);

    // Guardar clave privada localmente
    localStorage.setItem(`privateKey-${userId}`, JSON.stringify(privateKeyJwk));
  
    // Enviar la clave pública al backend para registrarla en la blockchain
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
      console.log("📝 Clave pública registrada exitosamente");
    } else {
      console.error("❌ Error al registrar la clave pública");
    }
  };

  const signTransaction = async (userId, message) => {
    const privateKeyJwk = JSON.parse(localStorage.getItem(`privateKey-${userId}`));
  
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["sign"]
    );
  
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    console.log("Hash SHA-256 del mensaje:", Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    const signature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      privateKey,
      encoded
    );
  
    // Convert ArrayBuffer to Base64 correctly
    const base64Signature = arrayBufferToBase64(signature);
    return base64Signature;
  };
  
  function arrayBufferToBase64(buffer) {
    return btoa(
      Array.from(new Uint8Array(buffer))
        .map(b => String.fromCharCode(b))
        .join("")
    );
  }
  
  return (
    <>
      <div> ${balance}</div>
      <div onClick={() => setShowPopup(true)} style={{ cursor: "pointer" }}>
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
                placeholder="Ingrese su user_id"
                value={user_id}
                onChange={(e) => setUser_id(e.target.value)}
              />
            </label>
            <label>
              Monto:
              <input
                type="number"
                placeholder="Ingrese el monto"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
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
