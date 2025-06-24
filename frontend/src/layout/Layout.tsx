import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from 'pages/dashboard';
import Breadcrumb from 'components/Breadcrumb';
import { UserManagement } from 'pages/UserManagement';

function Layout({ children }: any) {
  const [currentPanel, setCurrentPanel] = useState("admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

const getPanelTitle = (panel: string) => {
  switch (panel) {
    case 'dashboard': return 'Dashboard';
    case 'client-management': return 'Client Management';
    case 'user-management': return 'User Management';
    case 'inventory': return 'Inventory';
    case 'service': return 'Service';
    case 'settings': return 'Settings';
    default: return 'Dashboard';
  }
};


 const renderDashboard = () => {
  switch (currentPanel) {
    case 'admin':
      return <Dashboard />;
    case 'client-management':
      return <div>Client Management (Coming Soon)</div>;
    case 'user-management':
      return <UserManagement />;
    //   return <div>User Dashboard (Coming Soon)</div>;
    case 'inventory':
      return <div>Inventory Dashboard (Coming Soon)</div>;
    case 'service':
     return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-500">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              {/* <span className="text-2xl">⚙️</span> */}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Service Panel</h3>
            <p className="text-gray-600">Advanced configuration options coming soon...</p>
          </div>
        </div>
      );
    case 'settings':
      return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-500">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">⚙️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Settings Panel</h3>
            <p className="text-gray-600">Advanced configuration options coming soon...</p>
          </div>
        </div>
      );
    default:
      return <Dashboard />;
  }
};


  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-300 dark:text-slate-100 text-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentPanel={currentPanel}
        onPanelChange={setCurrentPanel}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden border-l border-slate-700 dark:border-slate-300">
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          title={getPanelTitle(currentPanel)}
        />

        <Breadcrumb pathSegments={[currentPanel]} />

        <main className="p-6 relative z-10 overflow-y-auto">
          <main className="p-6 relative z-10 overflow-y-auto">
  { renderDashboard()}
</main>

        </main>
      </div>
    </div>
  );
}

export default Layout;
