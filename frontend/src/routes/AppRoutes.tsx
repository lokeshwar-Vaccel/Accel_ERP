import NotFound from "pages/NotFound";
import { Route, Routes } from "react-router-dom"

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Add your protected routes here */}
            <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            <Route path="/profile" element={<div>Profile Page</div>} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    )
}

export default AppRoutes;