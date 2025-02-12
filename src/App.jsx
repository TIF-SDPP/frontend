import { useState } from "react";
import reactLogo from "./assets/react.svg";
import unluCoin from "/unlu.png";
import "./App.css";
import LoginButton from "./component/login/LoginButton";
import LogoutButton from "./component/login/LogoutButton";
import { useAuth0 } from "@auth0/auth0-react";
import MainLayout from "./component/layout/MainLayout";
import { ToastContainer } from "react-toastify";

function App() {
  const { user, isAuthenticated } = useAuth0();

  return (
    <>
      <ToastContainer />
      {isAuthenticated ? (
        <MainLayout />
      ) : (
        // <div>
        //   <LogoutButton />
        //   <img src={unluCoin} className="logo react" />
        //   {/* <img src={user.picture} alt={user.name} />
        //   <h2>{user.name}</h2>
        //   <p>{user.email}</p> */}
        // </div>
        <LoginButton />
      )}
    </>
  );
}

export default App;
