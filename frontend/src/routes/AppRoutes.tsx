import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import NotFound from "../pages/NotFound";
import { UserManagement } from "../pages/UserManagement";
import CustomerManagement from "../pages/CustomerManagement";
import ProductManagement from "../pages/ProductManagement";
import InventoryManagement from "../pages/InventoryManagement";
import InvoiceManagement from "../pages/InvoiceManagement";
import ServiceManagement from "../pages/ServiceManagement";
import AMCManagement from "../pages/AMCManagement";
import PurchaseOrderManagement from "../pages/PurchaseOrderManagement";
import ReportsManagement from "../pages/ReportsManagement";
import FileManagement from "../pages/FileManagement";
import CommunicationManagement from "../pages/CommunicationManagement";
import AdminSettings from "../pages/AdminSettings";
import PaymentPage from "../pages/PaymentPage";
import PaymentSuccess from "../pages/PaymentSuccess";
import { ForgotPasswordForm } from "components/features/auth/ForgotPasswordForm";
import { LoginForm } from "components/features/auth/LoginForm";
import { ResetPasswordForm } from "components/features/auth/ResetPasswordForm";
import QuotationManagement from "pages/QuotationManagement";

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Default route - redirect to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Main application routes */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* User Management */}
            <Route path="/user-management" element={<UserManagement />} />

            {/* Lead Management */}
            <Route path="/lead-management" element={<CustomerManagement />} />
            <Route path="/quotation-management" element={<QuotationManagement />} />

            {/* Product Management */}
            <Route path="/product-management" element={<ProductManagement />} />

            {/* Inventory Management */}
            <Route path="/inventory-management" element={<InventoryManagement />} />

            {/* Billing */}
            <Route path="/Billing" element={<InvoiceManagement />} />

            {/* Service Management */}
            <Route path="/service-management" element={<ServiceManagement />} />

            {/* AMC Management */}
            <Route path="/amc-management" element={<AMCManagement />} />

            {/* Purchase Order Management */}
            <Route path="/purchase-order-management" element={<PurchaseOrderManagement />} />

            {/* Reports & Analytics */}
            <Route path="/reports-management" element={<ReportsManagement />} />

            {/* File Management */}
            <Route path="/file-management" element={<FileManagement />} />

            {/* Communication Management */}
            <Route path="/communication-management" element={<CommunicationManagement />} />

            {/* Admin Settings */}
            <Route path="/admin-settings" element={<AdminSettings />} />

            {/* Payment Page - Public route for email payment links */}
            {/* <Route path="/pay/:token" element={<PaymentPage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} /> */}

            {/* 404 - Page not found */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;