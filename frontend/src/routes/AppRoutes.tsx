import Login from "components/Login";
import Dashboard from "../pages/dashboard";
import NotFound from "pages/NotFound";
import { Navigate, Route, Routes } from "react-router-dom"
import { UserManagement } from "pages/UserManagement";

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* <Route path="/" element={"Home page"} /> */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard/>} />
            <Route path="/user-management" element={<UserManagement/>} />
            {/* <Route path="*" element={<NotFound />} /> */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}


export default AppRoutes;