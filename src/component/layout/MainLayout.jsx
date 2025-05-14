import LeftSide from "./LeftSide";
import LogoutButton from "../login/LogoutButton";
import GpuTestComponent from "../GpuTestComponent";

const MainLayout = () => {
  return (
    <div className="mainLayout">
      <LogoutButton />
      <GpuTestComponent />
      <LeftSide />
    </div>
  );
};

export default MainLayout;
