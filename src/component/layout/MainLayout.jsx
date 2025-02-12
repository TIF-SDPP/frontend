import React from "react";
import LeftSide from "./LeftSide";
import LogoutButton from "../login/LogoutButton";
import GpuTestComponent from "../GpuTestComponent";

const MainLayout = () => {
  return (
    <div className="mainLayout">
      <GpuTestComponent />
      <LogoutButton />
      <LeftSide />
    </div>
  );
};

export default MainLayout;
