# Business Modules Seed Data Documentation

This document provides comprehensive details about the seed data created for various business modules in the Sun Power Services ERP system.

## Overview

The business modules seed script (`business-modules-seed.ts`) has successfully created sample data for the following modules:

- **Service Management**: 5 Service Tickets
- **AMC Management**: 3 AMC Contracts + 2 AMC Quotations
- **Purchase Orders**: 3 Purchase Orders
- **Billing**: 3 Invoices
- **Sales**: 8 Sales Quotations
- **Customer Purchase Orders**: 2 Purchase Orders from Customers
- **Digital Service Reports**: 2 Digital Service Reports

## Service Management

### Service Tickets (5)

**SR-2024-001**
- **Customer**: Rajesh Kumar (rajesh.kumar@example.com)
- **Status**: Open
- **Priority**: High
- **Engine Details**: Engine Serial No: ENG-001-2024, Make: Cummins, Model: C150D5
- **Issue**: Engine not starting, unusual noise
- **Assigned Engineer**: Rajesh Kumar (Field Engineer)
- **Service Request Number**: SR-2024-001
- **Created**: 2024-01-15

**SR-2024-002**
- **Customer**: Priya Sharma (priya.sharma@example.com)
- **Status**: In Progress
- **Priority**: Medium
- **Engine Details**: Engine Serial No: ENG-002-2024, Make: Perkins, Model: 1104D-44TA
- **Issue**: Regular maintenance service
- **Assigned Engineer**: Amit Patel (Field Engineer)
- **Service Request Number**: SR-2024-002
- **Created**: 2024-01-20

**SR-2024-003**
- **Customer**: Vikram Singh (vikram.singh@example.com)
- **Status**: Completed
- **Priority**: Low
- **Engine Details**: Engine Serial No: ENG-003-2024, Make: Kirloskar, Model: KDE12STA
- **Issue**: Oil change and filter replacement
- **Assigned Engineer**: Suresh Reddy (Field Engineer)
- **Service Request Number**: SR-2024-003
- **Created**: 2024-01-25

**SR-2024-004**
- **Customer**: Anjali Gupta (anjali.gupta@example.com)
- **Status**: Open
- **Priority**: High
- **Engine Details**: Engine Serial No: ENG-004-2024, Make: Cummins, Model: C200D6
- **Issue**: Engine overheating, coolant leak
- **Assigned Engineer**: Rajesh Kumar (Field Engineer)
- **Service Request Number**: SR-2024-004
- **Created**: 2024-02-01

**SR-2024-005**
- **Customer**: Ravi Verma (ravi.verma@example.com)
- **Status**: In Progress
- **Priority**: Medium
- **Engine Details**: Engine Serial No: ENG-005-2024, Make: Perkins, Model: 1104D-44TA
- **Issue**: Battery replacement and electrical check
- **Assigned Engineer**: Amit Patel (Field Engineer)
- **Service Request Number**: SR-2024-005
- **Created**: 2024-02-05

## AMC Management

### AMC Contracts (3)

**AMC-2024-001**
- **Customer**: Rajesh Kumar (rajesh.kumar@example.com)
- **Contract Type**: AMC
- **Duration**: 12 months
- **Start Date**: 2024-01-01
- **End Date**: 2024-12-31
- **Engine Details**: Engine Serial No: ENG-001-2024, Make: Cummins, Model: C150D5
- **Billing Cycle**: Yearly
- **Number of Visits**: 4
- **Number of Oil Services**: 2
- **Response Time**: 24 hours
- **Coverage Area**: Bangalore Urban
- **Emergency Contact Hours**: 24/7
- **Contract Value**: ₹180,000
- **Status**: Active

**AMC-2024-002**
- **Customer**: Priya Sharma (priya.sharma@example.com)
- **Contract Type**: AMC
- **Duration**: 12 months
- **Start Date**: 2024-02-01
- **End Date**: 2025-01-31
- **Engine Details**: Engine Serial No: ENG-002-2024, Make: Perkins, Model: 1104D-44TA
- **Billing Cycle**: Quarterly
- **Number of Visits**: 6
- **Number of Oil Services**: 3
- **Response Time**: 12 hours
- **Coverage Area**: Mumbai Metropolitan
- **Emergency Contact Hours**: 24/7
- **Contract Value**: ₹150,000
- **Status**: Active

**AMC-2024-003**
- **Customer**: Vikram Singh (vikram.singh@example.com)
- **Contract Type**: AMC
- **Duration**: 12 months
- **Start Date**: 2024-03-01
- **End Date**: 2025-02-28
- **Engine Details**: Engine Serial No: ENG-003-2024, Make: Kirloskar, Model: KDE12STA
- **Billing Cycle**: Monthly
- **Number of Visits**: 8
- **Number of Oil Services**: 4
- **Response Time**: 6 hours
- **Coverage Area**: Delhi NCR
- **Emergency Contact Hours**: 24/7
- **Contract Value**: ₹120,000
- **Status**: Active

### AMC Quotations (2)

**AMC-Q-2024-001**
- **Quotation Number**: AMC-Q-2024-001
- **Customer**: Rajesh Kumar (rajesh.kumar@example.com)
- **Quotation Type**: AMC
- **Issue Date**: 2024-01-05
- **Valid Until**: 2024-02-04
- **AMC Type**: AMC
- **Contract Duration**: 12 months
- **Contract Period**: 2024-01-01 to 2024-12-31
- **Billing Cycle**: Yearly
- **Number of Visits**: 4
- **Number of Oil Services**: 2
- **Response Time**: 24 hours
- **Coverage Area**: Bangalore Urban
- **Emergency Contact Hours**: 24/7
- **Offer Items**: Annual Maintenance Contract (1 unit @ ₹180,000)
- **Spares Items**: Engine Oil Filter (4 units @ ₹2,500 each)
- **Subtotal**: ₹190,000
- **Total Tax**: ₹34,200
- **Grand Total**: ₹224,200
- **Status**: Sent

**AMC-Q-2024-002**
- **Quotation Number**: AMC-Q-2024-002
- **Customer**: Priya Sharma (priya.sharma@example.com)
- **Quotation Type**: AMC
- **Issue Date**: 2024-02-05
- **Valid Until**: 2024-03-07
- **AMC Type**: AMC
- **Contract Duration**: 12 months
- **Contract Period**: 2024-02-01 to 2025-01-31
- **Billing Cycle**: Quarterly
- **Number of Visits**: 6
- **Number of Oil Services**: 3
- **Response Time**: 12 hours
- **Coverage Area**: Mumbai Metropolitan
- **Emergency Contact Hours**: 24/7
- **Offer Items**: Annual Maintenance Contract (1 unit @ ₹150,000)
- **Spares Items**: Air Filter (6 units @ ₹1,800 each)
- **Subtotal**: ₹160,800
- **Total Tax**: ₹28,944
- **Grand Total**: ₹189,744
- **Status**: Sent

## Purchase Orders

### Purchase Orders (3)

**PO-2024-001**
- **PO Number**: PO-2024-001
- **PO Type**: Purchase
- **Department**: Sales
- **Supplier**: Tech Solutions India (tech.solutions@example.com)
- **Supplier Address**: 123 Tech Park, Bangalore, Karnataka, 560001
- **Expected Delivery Date**: 2026-01-15
- **Items**: Dell OptiPlex 7090 Desktop (2 units @ ₹85,000 each)
- **Subtotal**: ₹170,000
- **Tax Amount**: ₹30,600
- **Total Amount**: ₹200,600
- **Status**: Pending

**PO-2024-002**
- **PO Number**: PO-2024-002
- **PO Type**: Purchase
- **Department**: Sales
- **Supplier**: Hardware Plus (hardware.plus@example.com)
- **Supplier Address**: 456 Hardware Lane, Mumbai, Maharashtra, 400001
- **Expected Delivery Date**: 2026-02-20
- **Items**: HP EliteBook 850 G8 Laptop (3 units @ ₹95,000 each)
- **Subtotal**: ₹285,000
- **Tax Amount**: ₹51,300
- **Total Amount**: ₹336,300
- **Status**: Approved

**PO-2024-003**
- **PO Number**: PO-2024-003
- **PO Type**: Purchase
- **Department**: Sales
- **Supplier**: Software Solutions Ltd (software.solutions@example.com)
- **Supplier Address**: 789 Software Street, Delhi, Delhi, 110001
- **Expected Delivery Date**: 2026-03-25
- **Items**: Cisco Catalyst 2960 Switch (2 units @ ₹12,000 each)
- **Subtotal**: ₹24,000
- **Tax Amount**: ₹4,320
- **Total Amount**: ₹28,320
- **Status**: Pending

## Billing (Invoices)

### Invoices (3)

**INV-2024-001**
- **Invoice Number**: INV-2024-001
- **Invoice Type**: Sale
- **Customer**: Rajesh Kumar (rajesh.kumar@example.com)
- **Location**: Main Warehouse
- **Items**: Dell OptiPlex 7090 Desktop (2 units @ ₹85,000 each)
- **Subtotal**: ₹170,000
- **Tax Amount**: ₹30,600
- **Total Amount**: ₹200,600
- **Paid Amount**: ₹0
- **Remaining Amount**: ₹200,600
- **Payment Status**: Pending
- **Status**: Draft

**INV-2024-002**
- **Invoice Number**: INV-2024-002
- **Invoice Type**: Sale
- **Customer**: Priya Sharma (priya.sharma@example.com)
- **Location**: Secondary Warehouse
- **Items**: HP EliteBook 850 G8 Laptop (3 units @ ₹95,000 each)
- **Subtotal**: ₹285,000
- **Tax Amount**: ₹51,300
- **Total Amount**: ₹336,300
- **Paid Amount**: ₹100,000
- **Remaining Amount**: ₹236,300
- **Payment Status**: Partial
- **Status**: Sent

**INV-2024-003**
- **Invoice Number**: INV-2024-003
- **Invoice Type**: Sale
- **Customer**: Vikram Singh (vikram.singh@example.com)
- **Location**: Service Center
- **Items**: Cisco Catalyst 2960 Switch (2 units @ ₹12,000 each)
- **Subtotal**: ₹24,000
- **Tax Amount**: ₹4,320
- **Total Amount**: ₹28,320
- **Paid Amount**: ₹24,000
- **Remaining Amount**: ₹4,320
- **Payment Status**: Partial
- **Status**: Sent

## Sales (Quotations)

### Sales Quotations (3)

**SQ-2024-001**
- **Quotation Number**: SQ-2024-001
- **Customer**: Rajesh Kumar (rajesh.kumar@example.com)
- **Quotation Type**: Sale
- **Issue Date**: 2024-01-10
- **Valid Until**: 2024-02-09
- **Items**: Dell OptiPlex 7090 Desktop (2 units @ ₹85,000 each)
- **Battery Buyback**: Old Battery Exchange (1 unit @ ₹5,000, Tax Rate: 18%)
- **Subtotal**: ₹175,000
- **Tax Amount**: ₹31,500
- **Total Amount**: ₹206,500
- **Status**: Sent

**SQ-2024-002**
- **Quotation Number**: SQ-2024-002
- **Customer**: Priya Sharma (priya.sharma@example.com)
- **Quotation Type**: Sale
- **Issue Date**: 2024-02-10
- **Valid Until**: 2024-03-11
- **Items**: HP EliteBook 850 G8 Laptop (3 units @ ₹95,000 each)
- **Battery Buyback**: Battery Upgrade (1 unit @ ₹8,000, Tax Rate: 18%)
- **Subtotal**: ₹293,000
- **Tax Amount**: ₹52,740
- **Total Amount**: ₹345,740
- **Status**: Sent

**SQ-2024-004**
- **Quotation Number**: SQ-2024-004
- **Customer**: Sunita Reddy (sunita.reddy@example.com)
- **Quotation Type**: Sale
- **Issue Date**: 2024-02-01
- **Valid Until**: 2024-03-02
- **Items**: Lenovo ThinkPad X1 Carbon (3 units @ ₹120,000 each)
- **Battery Buyback**: Battery Buy Back Service (0 units @ ₹0, Tax Rate: 18%)
- **Subtotal**: ₹360,000
- **Tax Amount**: ₹63,000
- **Total Amount**: ₹393,000
- **Status**: Sent

**SQ-2024-005**
- **Quotation Number**: SQ-2024-005
- **Customer**: Vikram Joshi (vikram.joshi@example.com)
- **Quotation Type**: Sale
- **Issue Date**: 2024-02-05
- **Valid Until**: 2024-03-06
- **Items**: Dell PowerEdge R750 Server (1 unit @ ₹450,000)
- **Battery Buyback**: Battery Buy Back Service (0 units @ ₹0, Tax Rate: 18%)
- **Subtotal**: ₹450,000
- **Tax Amount**: ₹76,500
- **Total Amount**: ₹501,500
- **Status**: Accepted

**SQ-2024-006**
- **Quotation Number**: SQ-2024-006
- **Customer**: Rajesh Kumar (rajesh.kumar@example.com)
- **Quotation Type**: Sale
- **Issue Date**: 2024-02-10
- **Valid Until**: 2024-03-11
- **Items**: HP LaserJet Pro M404dn Printer (4 units @ ₹25,000 each)
- **Battery Buyback**: Battery Buy Back Service (0 units @ ₹0, Tax Rate: 18%)
- **Subtotal**: ₹100,000
- **Tax Amount**: ₹16,560
- **Total Amount**: ₹108,560
- **Status**: Sent

**SQ-2024-007**
- **Quotation Number**: SQ-2024-007
- **Customer**: Priya Patel (priya.patel@example.com)
- **Quotation Type**: Sale
- **Issue Date**: 2024-02-15
- **Valid Until**: 2024-03-16
- **Items**: Microsoft Office 365 Business Premium (10 units @ ₹15,000 each)
- **Battery Buyback**: Battery Buy Back Service (0 units @ ₹0, Tax Rate: 18%)
- **Subtotal**: ₹150,000
- **Tax Amount**: ₹24,300
- **Total Amount**: ₹159,300
- **Status**: Draft

**SQ-2024-008**
- **Quotation Number**: SQ-2024-008
- **Customer**: Amit Singh (amit.singh@example.com)
- **Quotation Type**: Sale
- **Issue Date**: 2024-02-20
- **Valid Until**: 2024-03-21
- **Items**: Samsung 27" 4K Monitor (6 units @ ₹35,000 each)
- **Battery Buyback**: Battery Buy Back Service (0 units @ ₹0, Tax Rate: 18%)
- **Subtotal**: ₹210,000
- **Tax Amount**: ₹34,560
- **Total Amount**: ₹226,560
- **Status**: Sent

## Customer Purchase Orders

### Purchase Orders from Customers (2)

**CPO-2024-001**
- **PO Number**: CPO-2024-001
- **Customer**: Rajesh Kumar (rajesh.kumar@example.com)
- **Customer Address**: 123 MG Road, Bangalore, Karnataka, 560001
- **Items**: Dell OptiPlex 7090 Desktop (2 units @ ₹85,000 each, Tax Rate: 18%)
- **Subtotal**: ₹170,000
- **Tax Amount**: ₹30,600
- **Total Amount**: ₹200,600
- **Paid Amount**: ₹50,000
- **Remaining Amount**: ₹150,600
- **Status**: Customer Approved

**CPO-2024-002**
- **PO Number**: CPO-2024-002
- **Customer**: Priya Sharma (priya.sharma@example.com)
- **Customer Address**: 456 Linking Road, Mumbai, Maharashtra, 400001
- **Items**: HP EliteBook 850 G8 Laptop (3 units @ ₹95,000 each, Tax Rate: 18%)
- **Subtotal**: ₹285,000
- **Tax Amount**: ₹51,300
- **Total Amount**: ₹336,300
- **Paid Amount**: ₹100,000
- **Remaining Amount**: ₹236,300
- **Status**: Draft

## Digital Service Reports

### Digital Service Reports (2)

**DSR-2024-001**
- **Report Number**: DSR-2024-001
- **Customer**: Rajesh Kumar (rajesh.kumar@example.com)
- **Service Date**: 2024-01-15
- **Engine Details**: Engine Serial No: ENG-001-2024, Make: Cummins, Model: C150D5
- **Service Type**: Preventive Maintenance
- **Technician**: Rajesh Kumar (Field Engineer)
- **Service Description**: Regular maintenance service including oil change, filter replacement, and system check
- **Status**: Completed

**DSR-2024-002**
- **Report Number**: DSR-2024-002
- **Customer**: Priya Sharma (priya.sharma@example.com)
- **Service Date**: 2024-02-20
- **Engine Details**: Engine Serial No: ENG-002-2024, Make: Perkins, Model: 1104D-44TA
- **Service Type**: Repair Service
- **Technician**: Amit Patel (Field Engineer)
- **Service Description**: Engine repair service for starting issues and noise problems
- **Status**: Completed

## Data Relationships

### Customer References
- **Rajesh Kumar**: Referenced in 3 Service Tickets, 1 AMC Contract, 1 AMC Quotation, 1 Invoice, 1 Sales Quotation, 1 Customer PO, 1 Digital Service Report
- **Priya Sharma**: Referenced in 1 Service Ticket, 1 AMC Contract, 1 AMC Quotation, 1 Invoice, 1 Sales Quotation, 1 Customer PO, 1 Digital Service Report
- **Vikram Singh**: Referenced in 1 Service Ticket, 1 AMC Contract, 1 Invoice, 1 Sales Quotation, 1 Digital Service Report
- **Anjali Gupta**: Referenced in 1 Service Ticket
- **Ravi Verma**: Referenced in 1 Service Ticket

### Product References
- **Dell OptiPlex 7090 Desktop**: Referenced in 1 Purchase Order, 1 Invoice, 1 Sales Quotation, 1 Customer PO
- **HP EliteBook 850 G8 Laptop**: Referenced in 1 Purchase Order, 1 Invoice, 1 Sales Quotation, 1 Customer PO
- **Cisco Catalyst 2960 Switch**: Referenced in 1 Purchase Order, 1 Invoice, 1 Sales Quotation

### Supplier References
- **Tech Solutions India**: Referenced in 1 Purchase Order
- **Hardware Plus**: Referenced in 1 Purchase Order
- **Software Solutions Ltd**: Referenced in 1 Purchase Order

### Field Engineer References
- **Rajesh Kumar**: Assigned to 2 Service Tickets, 1 Digital Service Report
- **Amit Patel**: Assigned to 2 Service Tickets, 1 Digital Service Report
- **Suresh Reddy**: Assigned to 1 Service Ticket

## Summary Statistics

- **Total Service Tickets**: 5
- **Total AMC Contracts**: 3
- **Total AMC Quotations**: 2
- **Total Purchase Orders**: 3
- **Total Invoices**: 3
- **Total Sales Quotations**: 8
- **Total Customer Purchase Orders**: 2
- **Total Digital Service Reports**: 2

## Notes

1. All dates are set to 2024-2026 to ensure they are in the future for validation purposes
2. All monetary values are in Indian Rupees (₹)
3. Tax rates are set to 18% (standard GST rate in India)
4. All customers, products, and suppliers are referenced from existing seed data
5. Field engineers are referenced from existing user data
6. All data includes proper validation and follows the schema requirements
7. The seed script includes proper error handling and logging for each module

This comprehensive seed data provides a realistic foundation for testing and demonstrating all business modules in the Sun Power Services ERP system.
