import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import NotFound from "../pages/NotFound";
import AccessDenied from "../pages/AccessDenied";
import { UserManagement } from "../pages/UserManagement";
import CustomerManagement from "../pages/CustomerManagement";
import ProductManagement from "../pages/ProductManagement";
import InventoryManagement from "../pages/InventoryManagement";
import InvoiceManagement from "../pages/InvoiceManagement";
import InvoiceForm from "../pages/InvoiceForm";
import QuotationFormPage from "../pages/QuotationForm";
import QuotationPage from "../pages/QuotationPage";
import CreatePurchaseinvoiceForm from "../pages/CreatePurchaseinvoiceForm";
import ServiceManagement from "../pages/ServiceManagement";
import AMCManagement from "../pages/AMCManagement";
import PurchaseOrderManagement from "../pages/PurchaseOrderManagement";
import CreatePurchaseOrder from "../pages/CreatePurchaseOrder";
import DGPurchaseOrderManagement from "../pages/DGPurchaseOrderManagement";
import ReportsManagement from "../pages/ReportsManagement";
import FileManagement from "../pages/FileManagement";
import CommunicationManagement from "../pages/CommunicationManagement";
import AdminSettings from "../pages/AdminSettings";
import PaymentPage from "../pages/PaymentPage";
import PaymentSuccess from "../pages/PaymentSuccess";
import { ForgotPasswordForm } from "components/features/auth/ForgotPasswordForm";
import { LoginForm } from "components/features/auth/LoginForm";
import { ResetPasswordForm } from "components/features/auth/ResetPasswordForm";
import DGSales from "pages/DGSales";
import DGInvoiceForm from "pages/DGInvoiceForm";
import DGQuotationForm from "pages/DGQuotationForm";
import DeliveryChallanForm from "../components/DeliveryChallanForm";
import CreatePOFromCustomerForm from "pages/CreatePOFromCustomerForm";
import POFromCustomerManagement from "pages/POFromCustomerManagement";
import CreateDGProformaForm from "pages/CreateDGProformaForm";
import CreateDGInvoiceForm from "pages/CreateDGInvoiceForm";
import DGQuotationManagement from "pages/DGQuotationManagement";
import AMCQuotationManagement from "pages/AMCQuotationManagement";
import AMCQuotationForm from "components/quotations/AMCQuotationForm";
import AMCQuotationPrintPage from "pages/AMCQuotationPrintPage";
import OEMOrderManagement from "pages/OEMOrderManagement";
import ProtectedRoute from "./ProtectedRoute";

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Default route - redirect to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Access Denied Route */}
            <Route path="/access-denied" element={<AccessDenied />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } />

            {/* User Management - Requires admin permission */}
            <Route path="/user-management" element={
                <ProtectedRoute requiredPermission="admin">
                    <UserManagement />
                </ProtectedRoute>
            } />

            {/* CRM - Lead Management */}
            <Route path="/lead-management" element={
                <ProtectedRoute>
                    <CustomerManagement />
                </ProtectedRoute>
            } />

            {/* Product Management */}
            <Route path="/product-management" element={
                <ProtectedRoute>
                    <ProductManagement />
                </ProtectedRoute>
            } />

            {/* Inventory Management */}
            <Route path="/inventory-management" element={
                <ProtectedRoute>
                    <InventoryManagement />
                </ProtectedRoute>
            } />

            {/* Billing */}
            <Route path="/billing" element={
                <ProtectedRoute>
                    <InvoiceManagement />
                </ProtectedRoute>
            } />
            <Route path="/billing/create" element={
                <ProtectedRoute>
                    <InvoiceForm />
                </ProtectedRoute>
            } />
            <Route path="/billing/edit/:id" element={
                <ProtectedRoute>
                    <InvoiceForm />
                </ProtectedRoute>
            } />
            <Route path="/billing/quotation" element={
                <ProtectedRoute>
                    <QuotationPage />
                </ProtectedRoute>
            } />
            <Route path="/billing/quotation/create" element={
                <ProtectedRoute>
                    <QuotationFormPage />
                </ProtectedRoute>
            } />
            <Route path="/billing/quotation/edit" element={
                <ProtectedRoute>
                    <QuotationFormPage />
                </ProtectedRoute>
            } />
            <Route path="/billing/challan/create" element={
                <ProtectedRoute>
                    <DeliveryChallanForm />
                </ProtectedRoute>
            } />
            <Route path="/billing/challan/edit/:id" element={
                <ProtectedRoute>
                    <DeliveryChallanForm />
                </ProtectedRoute>
            } />

            {/* AMC Quotation Management */}
            <Route path="/amc-quotations" element={
                <ProtectedRoute>
                    <AMCQuotationManagement />
                </ProtectedRoute>
            } />
            <Route path="/amc-quotations/create" element={
                <ProtectedRoute>
                    <AMCQuotationForm />
                </ProtectedRoute>
            } />
            <Route path="/amc-quotations/edit/:id" element={
                <ProtectedRoute>
                    <AMCQuotationForm />
                </ProtectedRoute>
            } />
            <Route path="/amc-quotations/:id/print" element={
                <ProtectedRoute>
                    <AMCQuotationPrintPage />
                </ProtectedRoute>
            } />

            {/* Purchase Invoice Management */}
            <Route path="/purchase-invoice/create" element={
                <ProtectedRoute>
                    <CreatePurchaseinvoiceForm />
                </ProtectedRoute>
            } />
            <Route path="/purchase-invoice/edit/:id" element={
                <ProtectedRoute>
                    <CreatePurchaseinvoiceForm />
                </ProtectedRoute>
            } />

            {/* PO From Customer Management */}
            <Route path="/po-from-customer-management" element={
                <ProtectedRoute>
                    <POFromCustomerManagement />
                </ProtectedRoute>
            } />
            <Route path="/po-from-customer/create" element={
                <ProtectedRoute>
                    <CreatePOFromCustomerForm />
                </ProtectedRoute>
            } />
            <Route path="/po-from-customer/edit/:id" element={
                <ProtectedRoute>
                    <CreatePOFromCustomerForm />
                </ProtectedRoute>
            } />
            <Route path="/po-from-customer/:id" element={
                <ProtectedRoute>
                    <CreatePOFromCustomerForm />
                </ProtectedRoute>
            } />

            {/* Service Management */}
            <Route path="/service-management" element={
                <ProtectedRoute>
                    <ServiceManagement />
                </ProtectedRoute>
            } />

            {/* AMC Management */}
            <Route path="/amc-management" element={
                <ProtectedRoute>
                    <AMCManagement />
                </ProtectedRoute>
            } />

            {/* Purchase Order Management */}
            <Route path="/purchase-order-management" element={
                <ProtectedRoute>
                    <PurchaseOrderManagement />
                </ProtectedRoute>
            } />
            <Route path="/purchase-order-management/create" element={
                <ProtectedRoute>
                    <CreatePurchaseOrder />
                </ProtectedRoute>
            } />
            <Route path="/purchase-order-management/edit" element={
                <ProtectedRoute>
                    <CreatePurchaseOrder />
                </ProtectedRoute>
            } />

            {/* DG Purchase Order Management */}
            <Route path="/dg-purchase-order-management" element={
                <ProtectedRoute>
                    <DGPurchaseOrderManagement />
                </ProtectedRoute>
            } />

            {/* Reports & Analytics */}
            <Route path="/reports-management" element={
                <ProtectedRoute>
                    <ReportsManagement />
                </ProtectedRoute>
            } />

            {/* File Management */}
            <Route path="/file-management" element={
                <ProtectedRoute>
                    <FileManagement />
                </ProtectedRoute>
            } />

            {/* Communication Management */}
            <Route path="/communication-management" element={
                <ProtectedRoute>
                    <CommunicationManagement />
                </ProtectedRoute>
            } />

            {/* Admin Settings - Requires admin permission */}
            <Route path="/admin-settings" element={
                <ProtectedRoute requiredPermission="admin">
                    <AdminSettings />
                </ProtectedRoute>
            } />

            {/* Payment Page - Public route for email payment links */}
            {/* <Route path="/pay/:token" element={<PaymentPage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} /> */}

            {/* DG Sales */}
            <Route path="/dg-sales" element={
                <ProtectedRoute>
                    <DGSales />
                </ProtectedRoute>
            } />
            
            {/* DG Quotation Management */}
            <Route path="/dg-quotation-management" element={
                <ProtectedRoute>
                    <DGQuotationManagement />
                </ProtectedRoute>
            } />
            <Route path="/dg-quotation/create" element={
                <ProtectedRoute>
                    <DGQuotationForm />
                </ProtectedRoute>
            } />
            <Route path="/dg-quotation/edit/:id" element={
                <ProtectedRoute>
                    <DGQuotationForm />
                </ProtectedRoute>
            } />
            
            {/* DG Invoice Management */}
            <Route path="/dg-sales/invoice/create" element={
                <ProtectedRoute>
                    <CreateDGInvoiceForm />
                </ProtectedRoute>
            } />
            <Route path="/dg-sales/invoice/edit/:id" element={
                <ProtectedRoute>
                    <CreateDGInvoiceForm />
                </ProtectedRoute>
            } />

            {/* DG Proforma Forms */}
            <Route path="/dg-proforma/create" element={
                <ProtectedRoute>
                    <CreateDGProformaForm />
                </ProtectedRoute>
            } />
            <Route path="/dg-proforma/edit/:id" element={
                <ProtectedRoute>
                    <CreateDGProformaForm />
                </ProtectedRoute>
            } />
            <Route path="/dg-proforma/:id" element={
                <ProtectedRoute>
                    <CreateDGProformaForm />
                </ProtectedRoute>
            } />

            {/* OEM Order Management */}
            <Route path="/oem-order-management" element={
                <ProtectedRoute>
                    <OEMOrderManagement />
                </ProtectedRoute>
            } />

            {/* 404 - Page not found */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;