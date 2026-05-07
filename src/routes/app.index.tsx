import { Navigate } from "react-router-dom";

export default AppIndex;

function AppIndex() {
  return <Navigate to="/app/dashboard" />;
}
