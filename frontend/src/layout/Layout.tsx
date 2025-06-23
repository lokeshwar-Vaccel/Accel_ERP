import AppRoutes from "../routes/AppRoutes";

const Layout: React.FC = () => {
    return (
        <div>
            <header>
                <h1>ERP Layout</h1>
                {/* Add your header/navigation here */}
            </header>
            <main>
                <AppRoutes />
            </main>
        </div>
    )
};

export default Layout;