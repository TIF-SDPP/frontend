import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "react-toastify";
import { fetchPost } from "../../tools/useFetch";

const LeftOption = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [user_id, setUser_id] = useState("");
  const [amount, setAmount] = useState("");
  const { user, getAccessTokenSilently } = useAuth0();
  const [balance, setBalance] = useState("");

  useEffect(() => {
    handleBalance();
  }, []);

  const handleSubmit = async () => {
    try {
      const accessToken = import.meta.env.VITE_TOKEN;

      const response = await fetch(
        `https://blockchainsd.us.auth0.com/api/v2/users/${user_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      toast.error("El usuario no existe");
      return;
    }

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    try {
      const urlPost = "http://localhost:8090/transaction";

      const request = {
        user_from: user.sub,
        user_to: user_id,
        amount: amount,
      };

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
        `http://localhost:8090/balance/${user.sub}`,
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
