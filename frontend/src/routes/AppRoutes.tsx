import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import NotFound from "../pages/NotFound";
import { UserManagement } from "../pages/UserManagement";
import CustomerManagement from "../pages/CustomerManagement";
import ProductManagement from "../pages/ProductManagement";
import InventoryManagement from "../pages/InventoryManagement";
import InvoiceManagement from "../pages/InvoiceManagement";
import InvoiceForm from "../pages/InvoiceForm";
import QuotationFormPage from "../pages/QuotationForm";
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

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Default route - redirect to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Main application routes */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* User Management */}
            <Route path="/user-management" element={<UserManagement />} />

            {/* CRM */}
            <Route path="/lead-management" element={<CustomerManagement />} />

            {/* Product Management */}
            <Route path="/product-management" element={<ProductManagement />} />

            {/* Inventory Management */}
            <Route path="/inventory-management" element={<InventoryManagement />} />

            {/* Billing */}
            <Route path="/billing" element={<InvoiceManagement />} />
            <Route path="/billing/create" element={<InvoiceForm />} />
            <Route path="/billing/edit/:id" element={<InvoiceForm />} />
            <Route path="/billing/quotation/create" element={<QuotationFormPage />} />
            <Route path="/billing/quotation/edit" element={<QuotationFormPage />} />
            <Route path="/billing/challan/create" element={<DeliveryChallanForm />} />
            <Route path="/billing/challan/edit/:id" element={<DeliveryChallanForm />} />

            {/* Purchase Invoice Management */}
            <Route path="/purchase-invoice/create" element={<CreatePurchaseinvoiceForm />} />
            <Route path="/purchase-invoice/edit/:id" element={<CreatePurchaseinvoiceForm />} />

            {/* PO From Customer Management */}
            <Route path="/po-from-customer-management" element={<POFromCustomerManagement />} />
            <Route path="/po-from-customer/create" element={<CreatePOFromCustomerForm />} />
            <Route path="/po-from-customer/edit/:id" element={<CreatePOFromCustomerForm />} />
            <Route path="/po-from-customer/:id" element={<CreatePOFromCustomerForm />} />

            {/* Service Management */}
            <Route path="/service-management" element={<ServiceManagement />} />

            {/* AMC Management */}
            <Route path="/amc-management" element={<AMCManagement />} />

            {/* Purchase Order Management */}
            <Route path="/purchase-order-management" element={<PurchaseOrderManagement />} />
            <Route path="/purchase-order-management/create" element={<CreatePurchaseOrder />} />
            <Route path="/purchase-order-management/edit" element={<CreatePurchaseOrder />} />

            {/* DG Purchase Order Management */}
            <Route path="/dg-purchase-order-management" element={<DGPurchaseOrderManagement />} />

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

            {/* DG Sales */}
            <Route path="/dg-sales" element={<DGSales />} />
            
            {/* DG Quotation Management */}
            <Route path="/dg-quotation/create" element={<DGQuotationForm />} />
            <Route path="/dg-quotation/edit/:id" element={<DGQuotationForm />} />
            
            {/* DG Invoice Management */}
            <Route path="/dg-sales/invoice/create" element={<DGInvoiceForm />} />
            <Route path="/dg-sales/invoice/edit/:id" element={<DGInvoiceForm />} />

            {/* 404 - Page not found */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;