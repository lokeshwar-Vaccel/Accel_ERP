import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  moduleAccess: {
    module: string;
    access: boolean;
    permission: 'read' | 'write' | 'admin';
  }[];
}

function Layout({ children, moduleAccess }: LayoutProps) {
  const [currentPanel, setCurrentPanel] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  

  const getBreadcrumbs = (path: string) => {
    const segments = path.split('/').filter(segment => segment);
    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      return ['Dashboard'];
    }
    
    // Convert path segments to readable names
    const breadcrumbs = segments.map(segment => {
      switch (segment) {
        case 'dashboard': return 'Dashboard';
        case 'customer-management': return 'Lead Management';
        case 'user-management': return 'User  Management';
        case 'product-management': return 'Product Management';
        case 'inventory-management': return 'Inventory Management';
        case 'service-management': return 'Service Management';
        case 'amc-management': return 'AMC Management';
        case 'purchase-order-management': return 'Purchase Orders';
        case 'reports-management': return 'Reports & Analytics';
        case 'file-management': return 'File Management';
        case 'communication-management': return 'Communications';
        case 'admin-settings': return 'Admin Settings';
        default: return segment.charAt(0).toUpperCase() + segment.slice(1);
      }
    });

    return breadcrumbs;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentPanel={currentPanel}
        onPanelChange={setCurrentPanel}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        moduleAccess={moduleAccess} // Pass the moduleAccess prop
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          pathSegments={getBreadcrumbs(location.pathname)}
        />

        <main className="flex-1 overflow-y-auto p-2">
          <div className="h-full overflow-y-auto rounded-2xl bg-white shadow-lg border border-gray-200 p-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
