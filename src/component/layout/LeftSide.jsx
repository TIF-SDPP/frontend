import unluCoin from "/unlu.png";
import { useAuth0 } from "@auth0/auth0-react";
import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import LeftOption from "./LeftTable";
const LeftSide = () => {
  const { user } = useAuth0();
  const [showPopUp, setShowPopUp] = useState(false);
  const handleBlockClick = useCallback(() => {
    setShowPopUp((prev) => !prev);
  }, []);
  const buttonRef = useRef(null);
  console.log(user);

  return (
    <div className="leftSide">
      <img src={unluCoin} alt="Logo UNLU" className="logo" />
      <LeftOption />

      <img
        ref={buttonRef}
        onClick={handleBlockClick}
        aria-expanded={showPopUp}
        src={user.picture}
        alt={user.name}
        className="imageUser"
      />
      {showPopUp &&
        createPortal(
          <div
            className="absolute-container"
            style={{
              top: buttonRef.current
                ? buttonRef.current.getBoundingClientRect().bottom +
                  window.scrollY +
                  "px"
                : "50px",
              left: buttonRef.current
                ? buttonRef.current.getBoundingClientRect().left + "px"
                : "50px",
            }}
          >
            {user.sub}
          </div>,
          document.body
        )}
    </div>
  );
};

export default LeftSide;
