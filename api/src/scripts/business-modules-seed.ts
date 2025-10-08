import mongoose from 'mongoose';
import { connectDB } from '../database/connection';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { ServiceTicket } from '../models/ServiceTicket';
import { AMC } from '../models/AMC';
import { AMCQuotation } from '../models/AMCQuotation';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Invoice } from '../models/Invoice';
import { Quotation } from '../models/Quotation';
import POFromCustomer from '../models/POFromCustomer';
import { DigitalServiceReport } from '../models/DigitalServiceReport';
import { StockLocation } from '../models/Stock';
import { TicketStatus, TicketPriority, TypeOfVisit, NatureOfWork, SubNatureOfWork, AMCStatus } from '../types';

async function createBusinessModulesSeedData() {
  try {
    console.log('🔄 Starting business modules seed data creation...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('Admin user not found');
    }
    console.log(`✅ Found admin user: ${adminUser.email}`);

    // Find some customers, products, and suppliers
    const customers = await Customer.find({}).limit(5);
    const products = await Product.find({}).limit(10);
    const suppliers = await Customer.find({ type: 'supplier' }).limit(3);
    const stockLocations = await StockLocation.find({}).limit(2);
    const fieldEngineers = await User.find({ role: 'field_engineer' }).limit(3);

    if (customers.length === 0 || products.length === 0 || suppliers.length === 0) {
      throw new Error('Required data (customers, products, suppliers) not found. Please run complete-seed.ts first.');
    }

    console.log(`📊 Found ${customers.length} customers, ${products.length} products, ${suppliers.length} suppliers`);

    // 1. Create Service Tickets
    console.log('\n🔧 Creating service tickets...');
    const serviceTicketsData = [
      {
        ServiceRequestNumber: 'SR-2024-001',
        CustomerType: 'DG',
        CustomerName: customers[0].name,
        EngineSerialNumber: 'ENG-001-2024',
        EngineModel: 'Cummins C150D5',
        KVA: '150',
        ServiceRequestDate: new Date('2024-01-15'),
        ServiceAttendedDate: new Date('2024-01-16'),
        HourMeterReading: '2500',
        TypeofService: 'Breakdown Service',
        SiteID: 'SITE-001',
        ServiceEngineerName: fieldEngineers[0]?._id || adminUser._id,
        ComplaintCode: 'CC-001',
        ComplaintDescription: 'Engine not starting, unusual noise from engine compartment',
        ResolutionDescription: 'Replaced faulty fuel pump and cleaned fuel lines. Engine now running smoothly.',
        eFSRNumber: 'eFSR-001-2024',
        eFSRClosureDateAndTime: new Date('2024-01-16T15:30:00'),
        ServiceRequestStatus: TicketStatus.RESOLVED,
        OemName: 'Cummins India',
        customer: customers[0]._id,
        products: [products[0]._id],
        assignedTo: fieldEngineers[0]?._id || adminUser._id,
        scheduledDate: new Date('2024-01-16'),
        completedDate: new Date('2024-01-16'),
        partsUsed: [{
          product: products[0]._id,
          quantity: 1,
          serialNumbers: ['FP-001-2024']
        }],
        serviceReport: 'Engine breakdown service completed successfully. Replaced fuel pump and cleaned fuel system.',
        slaDeadline: new Date('2024-01-17'),
        serviceCharge: 15000,
        typeOfVisit: TypeOfVisit.PAID_VISIT,
        natureOfWork: NatureOfWork.BREAKDOWN,
        subNatureOfWork: SubNatureOfWork.PAID,
        createdBy: adminUser._id
      },
      {
        ServiceRequestNumber: 'SR-2024-002',
        CustomerType: 'DG',
        CustomerName: customers[1].name,
        EngineSerialNumber: 'ENG-002-2024',
        EngineModel: 'Kirloskar KTA19G3',
        KVA: '200',
        ServiceRequestDate: new Date('2024-01-20'),
        ServiceAttendedDate: new Date('2024-01-21'),
        HourMeterReading: '3200',
        TypeofService: 'Preventive Maintenance',
        SiteID: 'SITE-002',
        ServiceEngineerName: fieldEngineers[1]?._id || adminUser._id,
        ComplaintCode: 'CC-002',
        ComplaintDescription: 'Scheduled preventive maintenance service',
        ResolutionDescription: 'Completed oil change, filter replacement, and general inspection. All systems functioning normally.',
        eFSRNumber: 'eFSR-002-2024',
        eFSRClosureDateAndTime: new Date('2024-01-21T12:00:00'),
        ServiceRequestStatus: TicketStatus.RESOLVED,
        OemName: 'Kirloskar Oil Engines',
        customer: customers[1]._id,
        products: [products[1]._id, products[2]._id],
        assignedTo: fieldEngineers[1]?._id || adminUser._id,
        scheduledDate: new Date('2024-01-21'),
        completedDate: new Date('2024-01-21'),
        partsUsed: [{
          product: products[1]._id,
          quantity: 2,
          serialNumbers: ['OF-001-2024', 'OF-002-2024']
        }],
        serviceReport: 'Preventive maintenance completed. Oil and filters replaced. Engine performance excellent.',
        slaDeadline: new Date('2024-01-22'),
        serviceCharge: 8000,
        typeOfVisit: TypeOfVisit.AMC_VISIT,
        natureOfWork: NatureOfWork.PM_VISIT,
        subNatureOfWork: SubNatureOfWork.PPM,
        createdBy: adminUser._id
      },
      {
        ServiceRequestNumber: 'SR-2024-003',
        CustomerType: 'DG',
        CustomerName: customers[2].name,
        EngineSerialNumber: 'ENG-003-2024',
        EngineModel: 'Mahindra Powerol M2DI',
        KVA: '125',
        ServiceRequestDate: new Date('2024-01-25'),
        ServiceAttendedDate: new Date('2024-01-26'),
        HourMeterReading: '1800',
        TypeofService: 'Installation Support',
        SiteID: 'SITE-003',
        ServiceEngineerName: fieldEngineers[2]?._id || adminUser._id,
        ComplaintCode: 'CC-003',
        ComplaintDescription: 'New DG installation commissioning and testing',
        ResolutionDescription: 'Successfully commissioned new DG set. All tests passed. Customer trained on operation.',
        eFSRNumber: 'eFSR-003-2024',
        eFSRClosureDateAndTime: new Date('2024-01-26T16:45:00'),
        ServiceRequestStatus: TicketStatus.RESOLVED,
        OemName: 'Mahindra Powerol',
        customer: customers[2]._id,
        products: [products[3]._id],
        assignedTo: fieldEngineers[2]?._id || adminUser._id,
        scheduledDate: new Date('2024-01-26'),
        completedDate: new Date('2024-01-26'),
        partsUsed: [],
        serviceReport: 'New DG installation commissioned successfully. All systems operational.',
        slaDeadline: new Date('2024-01-27'),
        serviceCharge: 25000,
        typeOfVisit: TypeOfVisit.INSTALLATION_VISIT,
        natureOfWork: NatureOfWork.INSTALLATION,
        subNatureOfWork: SubNatureOfWork.COMMISSIONING,
        createdBy: adminUser._id
      },
      {
        ServiceRequestNumber: 'SR-2024-004',
        CustomerType: 'DG',
        CustomerName: customers[3].name,
        EngineSerialNumber: 'ENG-004-2024',
        EngineModel: 'Ashok Leyland AL-125',
        KVA: '125',
        ServiceRequestDate: new Date('2024-01-28'),
        ServiceAttendedDate: new Date('2024-01-29'),
        HourMeterReading: '4100',
        TypeofService: 'Oil Service',
        SiteID: 'SITE-004',
        ServiceEngineerName: fieldEngineers[0]?._id || adminUser._id,
        ComplaintCode: 'CC-004',
        ComplaintDescription: 'Engine oil service and filter replacement',
        ResolutionDescription: 'Oil service completed. Replaced engine oil, oil filter, and air filter.',
        eFSRNumber: 'eFSR-004-2024',
        eFSRClosureDateAndTime: new Date('2024-01-29T14:20:00'),
        ServiceRequestStatus: TicketStatus.RESOLVED,
        OemName: 'Ashok Leyland',
        customer: customers[3]._id,
        products: [products[4]._id],
        assignedTo: fieldEngineers[0]?._id || adminUser._id,
        scheduledDate: new Date('2024-01-29'),
        completedDate: new Date('2024-01-29'),
        partsUsed: [{
          product: products[4]._id,
          quantity: 1,
          serialNumbers: ['EO-001-2024']
        }],
        serviceReport: 'Oil service completed successfully. Engine running smoothly.',
        slaDeadline: new Date('2024-01-30'),
        serviceCharge: 5000,
        typeOfVisit: TypeOfVisit.OIL_SERVICE,
        natureOfWork: NatureOfWork.OIL_SERVICE,
        subNatureOfWork: SubNatureOfWork.PPM,
        createdBy: adminUser._id
      },
      {
        ServiceRequestNumber: 'SR-2024-005',
        CustomerType: 'DG',
        CustomerName: customers[4].name,
        EngineSerialNumber: 'ENG-005-2024',
        EngineModel: 'Tata Cummins TCD2015',
        KVA: '180',
        ServiceRequestDate: new Date('2024-02-01'),
        ServiceAttendedDate: new Date('2024-02-02'),
        HourMeterReading: '2900',
        TypeofService: 'Warranty Service',
        SiteID: 'SITE-005',
        ServiceEngineerName: fieldEngineers[1]?._id || adminUser._id,
        ComplaintCode: 'CC-005',
        ComplaintDescription: 'Warranty claim - Engine overheating issue',
        ResolutionDescription: 'Replaced faulty thermostat and coolant pump under warranty. Engine temperature now normal.',
        eFSRNumber: 'eFSR-005-2024',
        eFSRClosureDateAndTime: new Date('2024-02-02T11:15:00'),
        ServiceRequestStatus: TicketStatus.RESOLVED,
        OemName: 'Tata Cummins',
        customer: customers[4]._id,
        products: [products[5]._id],
        assignedTo: fieldEngineers[1]?._id || adminUser._id,
        scheduledDate: new Date('2024-02-02'),
        completedDate: new Date('2024-02-02'),
        partsUsed: [{
          product: products[5]._id,
          quantity: 1,
          serialNumbers: ['TH-001-2024']
        }],
        serviceReport: 'Warranty service completed. Engine overheating issue resolved.',
        slaDeadline: new Date('2024-02-03'),
        serviceCharge: 0,
        typeOfVisit: TypeOfVisit.WARRANTY,
        natureOfWork: NatureOfWork.BREAKDOWN,
        subNatureOfWork: SubNatureOfWork.WARRANTY,
        createdBy: adminUser._id
      }
    ];

    // Clear existing service tickets
    await ServiceTicket.deleteMany({});
    
    const createdServiceTickets = [];
    for (const ticketData of serviceTicketsData) {
      const ticket = new ServiceTicket(ticketData);
      await ticket.save();
      createdServiceTickets.push(ticket);
      console.log(`✅ Created service ticket: ${ticket.ServiceRequestNumber}`);
    }

    // 2. Create AMC Contracts
    console.log('\n📋 Creating AMC contracts...');
    const amcContractsData = [
      {
        contractNumber: 'AMC-2024-001',
        customer: customers[0]._id,
        customerAddress: customers[0].addresses?.[0]?.address || '123 Industrial Area, Bangalore',
        contactPersonName: 'Rajesh Kumar',
        contactNumber: '+91-9876543001',
        engineSerialNumber: 'ENG-001-2024',
        engineModel: 'Cummins C150D5',
        kva: 150,
        dgMake: 'Cummins',
        dateOfCommissioning: new Date('2023-06-15'),
        amcStartDate: new Date('2024-01-01'),
        amcEndDate: new Date('2024-12-31'),
        amcType: 'AMC',
        numberOfVisits: 12,
        numberOfOilServices: 4,
        products: [products[0]._id, products[1]._id],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contractValue: 180000,
        scheduledVisits: 12,
        completedVisits: 3,
        status: AMCStatus.ACTIVE,
        nextVisitDate: new Date('2024-02-15'),
        visitSchedule: [
          {
            visitNumber: 1,
            scheduledDate: new Date('2024-01-15'),
            status: 'completed'
          },
          {
            visitNumber: 2,
            scheduledDate: new Date('2024-02-15'),
            status: 'pending'
          },
          {
            visitNumber: 3,
            scheduledDate: new Date('2024-03-15'),
            status: 'pending'
          }
        ],
        terms: 'Annual Maintenance Contract covering preventive maintenance, breakdown support, and spare parts.',
        createdBy: adminUser._id
      },
      {
        contractNumber: 'AMC-2024-002',
        customer: customers[1]._id,
        customerAddress: customers[1].addresses?.[0]?.address || '456 Tech Park, Mumbai',
        contactPersonName: 'Priya Sharma',
        contactNumber: '+91-9876543002',
        engineSerialNumber: 'ENG-002-2024',
        engineModel: 'Kirloskar KTA19G3',
        kva: 200,
        dgMake: 'Kirloskar',
        dateOfCommissioning: new Date('2023-08-20'),
        amcStartDate: new Date('2024-01-01'),
        amcEndDate: new Date('2024-12-31'),
        amcType: 'CAMC',
        numberOfVisits: 24,
        numberOfOilServices: 8,
        products: [products[2]._id, products[3]._id],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contractValue: 250000,
        scheduledVisits: 24,
        completedVisits: 5,
        status: AMCStatus.ACTIVE,
        nextVisitDate: new Date('2024-02-20'),
        visitSchedule: [
          {
            visitNumber: 1,
            scheduledDate: new Date('2024-01-05'),
            status: 'completed'
          },
          {
            visitNumber: 2,
            scheduledDate: new Date('2024-01-20'),
            status: 'completed'
          },
          {
            visitNumber: 3,
            scheduledDate: new Date('2024-02-05'),
            status: 'completed'
          },
          {
            visitNumber: 4,
            scheduledDate: new Date('2024-02-20'),
            status: 'pending'
          }
        ],
        terms: 'Comprehensive Annual Maintenance Contract with monthly visits and comprehensive coverage.',
        createdBy: adminUser._id
      },
      {
        contractNumber: 'AMC-2024-003',
        customer: customers[2]._id,
        customerAddress: customers[2].addresses?.[0]?.address || '789 Business District, Delhi',
        contactPersonName: 'Amit Verma',
        contactNumber: '+91-9876543003',
        engineSerialNumber: 'ENG-003-2024',
        engineModel: 'Mahindra Powerol M2DI',
        kva: 125,
        dgMake: 'Mahindra',
        dateOfCommissioning: new Date('2023-12-10'),
        amcStartDate: new Date('2024-01-01'),
        amcEndDate: new Date('2024-12-31'),
        amcType: 'AMC',
        numberOfVisits: 12,
        numberOfOilServices: 4,
        products: [products[4]._id],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contractValue: 120000,
        scheduledVisits: 12,
        completedVisits: 1,
        status: AMCStatus.ACTIVE,
        nextVisitDate: new Date('2024-02-10'),
        visitSchedule: [
          {
            visitNumber: 1,
            scheduledDate: new Date('2024-01-10'),
            status: 'completed'
          },
          {
            visitNumber: 2,
            scheduledDate: new Date('2024-02-10'),
            status: 'pending'
          }
        ],
        terms: 'Standard AMC contract with quarterly visits and basic maintenance coverage.',
        createdBy: adminUser._id
      }
    ];

    // Clear existing AMC contracts
    await AMC.deleteMany({});
    
    const createdAMCs = [];
    for (const amcData of amcContractsData) {
      const amc = new AMC(amcData);
      await amc.save();
      createdAMCs.push(amc);
      console.log(`✅ Created AMC contract: ${amc.contractNumber}`);
    }

    // 3. Create AMC Quotations
    console.log('\n📄 Creating AMC quotations...');
    const amcQuotationsData = [
      {
        quotationNumber: 'AMC-Q-2024-001',
        quotationType: 'amc',
        issueDate: new Date('2024-01-01'),
        validUntil: new Date('2024-01-31'),
        customer: {
          _id: customers[0]._id,
          name: customers[0].name,
          email: customers[0].email,
          phone: customers[0].phone,
          pan: customers[0].panNumber
        },
        company: {
          name: 'Sun Power Services',
          address: '123 Industrial Area, Bangalore, Karnataka 560001',
          phone: '+91-9876543000',
          email: 'info@sunpowerservices.com',
          pan: 'SUNPS1234A',
          bankDetails: {
            bankName: 'State Bank of India',
            accountNo: '1234567890',
            ifsc: 'SBIN0001234',
            branch: 'Industrial Area Branch'
          }
        },
        location: stockLocations[0]?._id,
        assignedEngineer: fieldEngineers[0]?._id || adminUser._id,
        amcType: 'AMC',
        contractDuration: 12,
        contractStartDate: new Date('2024-01-01'),
        contractEndDate: new Date('2024-12-31'),
        billingCycle: 'yearly',
        numberOfVisits: 12,
        numberOfOilServices: 4,
        responseTime: 24,
        coverageArea: 'Bangalore and surrounding areas',
        emergencyContactHours: '24/7',
        exclusions: ['Damage due to natural calamities', 'Unauthorized modifications'],
        performanceMetrics: {
          avgResponseTime: 4,
          customerSatisfaction: 95,
          issueResolutionRate: 98
        },
        warrantyTerms: '12 months warranty on all replaced parts',
        paymentTerms: 'Advance payment required',
        renewalTerms: 'Automatic renewal unless cancelled 30 days prior',
        discountPercentage: 5,
        offerItems: [{
          description: 'Annual Maintenance Contract',
          quantity: 1,
          unitPrice: 180000,
          discount: 0,
          discountedAmount: 180000,
          taxRate: 18,
          taxAmount: 32400,
          totalPrice: 212400,
          engineSlNo: 'ENG-001-2024',
          make: 'Cummins'
        }],
        sparesItems: [{
          product: products[0]._id,
          description: 'Engine Oil Filter',
          hsnNumber: '8471.30.00',
          hsnCode: '8471.30.00',
          partNo: 'OIL-FILTER-001',
          srNo: 1,
          quantity: 4,
          unitPrice: 2500,
          discount: 0,
          discountedAmount: 10000,
          taxRate: 18,
          taxAmount: 1800,
          totalPrice: 11800,
          availableQuantity: 10
        }],
        amcPeriodFrom: new Date('2024-01-01'),
        amcPeriodTo: new Date('2024-12-31'),
        subtotal: 190000,
        totalDiscount: 0,
        totalTax: 34200,
        grandTotal: 224200,
        roundOff: 0,
        notes: 'This quotation is valid for 30 days from the date of issue.',
        terms: 'Terms and conditions apply as per standard AMC agreement.',
        validityPeriod: 30,
        paymentStatus: 'pending',
        status: 'sent',
        createdBy: adminUser._id
      },
      {
        quotationNumber: 'AMC-Q-2024-002',
        quotationType: 'amc',
        issueDate: new Date('2024-01-05'),
        validUntil: new Date('2024-02-04'),
        customer: {
          _id: customers[1]._id,
          name: customers[1].name,
          email: customers[1].email,
          phone: customers[1].phone,
          pan: customers[1].panNumber
        },
        company: {
          name: 'Sun Power Services',
          address: '123 Industrial Area, Bangalore, Karnataka 560001',
          phone: '+91-9876543000',
          email: 'info@sunpowerservices.com',
          pan: 'SUNPS1234A'
        },
        location: stockLocations[1]?._id,
        assignedEngineer: fieldEngineers[1]?._id || adminUser._id,
        amcType: 'CAMC',
        contractDuration: 12,
        contractStartDate: new Date('2024-01-01'),
        contractEndDate: new Date('2024-12-31'),
        billingCycle: 'quarterly',
        numberOfVisits: 24,
        numberOfOilServices: 8,
        responseTime: 12,
        coverageArea: 'Mumbai and surrounding areas',
        emergencyContactHours: '24/7',
        exclusions: ['Damage due to natural calamities'],
        performanceMetrics: {
          avgResponseTime: 2,
          customerSatisfaction: 98,
          issueResolutionRate: 99
        },
        warrantyTerms: '12 months warranty on all replaced parts',
        paymentTerms: 'Quarterly advance payment',
        renewalTerms: 'Automatic renewal unless cancelled 30 days prior',
        discountPercentage: 10,
        offerItems: [{
          description: 'Comprehensive Annual Maintenance Contract',
          quantity: 1,
          unitPrice: 250000,
          discount: 25000,
          discountedAmount: 225000,
          taxRate: 18,
          taxAmount: 40500,
          totalPrice: 265500,
          engineSlNo: 'ENG-002-2024',
          make: 'Kirloskar'
        }],
        sparesItems: [{
          product: products[1]._id,
          description: 'Air Filter',
          hsnNumber: '8421.23.00',
          hsnCode: '8421.23.00',
          partNo: 'AIR-FILTER-001',
          srNo: 1,
          quantity: 8,
          unitPrice: 1500,
          discount: 0,
          discountedAmount: 12000,
          taxRate: 18,
          taxAmount: 2160,
          totalPrice: 14160,
          availableQuantity: 15
        }],
        amcPeriodFrom: new Date('2024-01-01'),
        amcPeriodTo: new Date('2024-12-31'),
        subtotal: 237000,
        totalDiscount: 25000,
        totalTax: 42660,
        grandTotal: 279660,
        roundOff: 0,
        notes: 'This quotation includes comprehensive coverage with monthly visits.',
        terms: 'Terms and conditions apply as per standard CAMC agreement.',
        validityPeriod: 30,
        paymentStatus: 'pending',
        status: 'sent',
        createdBy: adminUser._id
      }
    ];

    // Clear existing AMC quotations
    await AMCQuotation.deleteMany({});
    
    const createdAMCQuotations = [];
    for (const quotationData of amcQuotationsData) {
      const quotation = new AMCQuotation(quotationData);
      await quotation.save();
      createdAMCQuotations.push(quotation);
      console.log(`✅ Created AMC quotation: ${quotation.quotationNumber}`);
    }

    // 4. Create Purchase Orders
    console.log('\n📦 Creating purchase orders...');
    const purchaseOrdersData = [
      {
        poNumber: 'PO-2024-001',
        supplier: suppliers[0]._id,
        supplierEmail: suppliers[0].email,
        supplierAddress: {
          id: 1,
          address: suppliers[0].addresses?.[0]?.address || '501 Tech Park, Electronic City, Bangalore',
          state: 'Karnataka',
          district: 'Bangalore Urban',
          pincode: '560100',
          gstNumber: suppliers[0].addresses?.[0]?.gstNumber || '29TECHC1234A1Z5',
          isPrimary: true
        },
        orderDate: new Date('2024-01-10'),
        expectedDeliveryDate: new Date('2026-01-25'),
        status: 'order_under_process',
        department: 'retail',
        purchaseOrderType: 'commercial',
        items: [{
          product: products[0]._id,
          quantity: 10,
          unitPrice: 85000,
          discountRate: 0,
          discountAmount: 0,
          totalPrice: 850000,
          taxRate: 18,
          receivedQuantity: 0
        }, {
          product: products[1]._id,
          quantity: 5,
          unitPrice: 95000,
          discountRate: 0,
          discountAmount: 0,
          totalPrice: 475000,
          taxRate: 18,
          receivedQuantity: 0
        }],
        totalAmount: 1563500,
        paidAmount: 0,
        remainingAmount: 1563500,
        paymentStatus: 'pending',
        notes: 'Urgent requirement for new office setup',
        createdBy: adminUser._id
      },
      {
        poNumber: 'PO-2024-002',
        supplier: suppliers[1]._id,
        supplierEmail: suppliers[1].email,
        supplierAddress: {
          id: 1,
          address: suppliers[1].addresses?.[0]?.address || '123 IT Hub, Hitec City, Hyderabad',
          state: 'Telangana',
          district: 'Hyderabad',
          pincode: '500081',
          gstNumber: suppliers[1].addresses?.[0]?.gstNumber || '36SOFTS1234B1Z6',
          isPrimary: true
        },
        orderDate: new Date('2024-01-15'),
        expectedDeliveryDate: new Date('2026-01-30'),
        status: 'partially_invoiced',
        department: 'corporate',
        purchaseOrderType: 'commercial',
        items: [{
          product: products[2]._id,
          quantity: 50,
          unitPrice: 1200,
          discountRate: 0,
          discountAmount: 0,
          totalPrice: 60000,
          taxRate: 18,
          receivedQuantity: 30
        }],
        totalAmount: 70800,
        paidAmount: 30000,
        remainingAmount: 40800,
        paymentStatus: 'partial',
        notes: 'Software licenses for new employees',
        createdBy: adminUser._id
      },
      {
        poNumber: 'PO-2024-003',
        supplier: suppliers[2]._id,
        supplierEmail: suppliers[2].email,
        supplierAddress: {
          id: 1,
          address: suppliers[2].addresses?.[0]?.address || '456 Hardware Hub, Mumbai',
          state: 'Maharashtra',
          district: 'Mumbai',
          pincode: '400001',
          gstNumber: suppliers[2].addresses?.[0]?.gstNumber || '27HARD1234C1Z7',
          isPrimary: true
        },
        orderDate: new Date('2024-01-20'),
        expectedDeliveryDate: new Date('2026-02-05'),
        status: 'fully_invoiced',
        department: 'industrial_marine',
        purchaseOrderType: 'commercial',
        items: [{
          product: products[3]._id,
          quantity: 3,
          unitPrice: 45000,
          discountRate: 0,
          discountAmount: 0,
          totalPrice: 135000,
          taxRate: 18,
          receivedQuantity: 3
        }],
        totalAmount: 159300,
        paidAmount: 159300,
        remainingAmount: 0,
        paymentStatus: 'paid',
        notes: 'Network equipment for expansion',
        createdBy: adminUser._id
      }
    ];

    // Clear existing purchase orders
    await PurchaseOrder.deleteMany({});
    
    const createdPurchaseOrders = [];
    for (const poData of purchaseOrdersData) {
      const po = new PurchaseOrder(poData);
      await po.save();
      createdPurchaseOrders.push(po);
      console.log(`✅ Created purchase order: ${po.poNumber}`);
    }

    // 5. Create Invoices (Billing)
    console.log('\n💰 Creating invoices...');
    const invoicesData = [
      {
        invoiceNumber: 'INV-2024-001',
        customer: customers[0]._id,
        user: adminUser._id,
        issueDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-14'),
        status: 'sent',
        invoiceType: 'sale',
        location: stockLocations[0]?._id,
        items: [{
          product: products[0]._id,
          description: 'Dell OptiPlex 7090 Desktop',
          hsnNumber: '8471.30.00',
          quantity: 2,
          unitPrice: 85000,
          taxRate: 18,
          taxAmount: 30600,
          totalPrice: 200600,
          partNo: 'DELL-OPT-7090'
        }],
        serviceCharges: [],
        subtotal: 170000,
        taxAmount: 30600,
        totalAmount: 200600,
        paidAmount: 0,
        remainingAmount: 200600,
        paymentStatus: 'pending',
        notes: 'Desktop computers for office setup',
        terms: 'Payment within 30 days',
        createdBy: adminUser._id
      },
      {
        invoiceNumber: 'INV-2024-002',
        customer: customers[1]._id,
        user: adminUser._id,
        issueDate: new Date('2024-01-20'),
        dueDate: new Date('2024-02-19'),
        status: 'sent',
        invoiceType: 'sale',
        location: stockLocations[1]?._id,
        items: [{
          product: products[1]._id,
          description: 'HP EliteBook 840 G8 Laptop',
          hsnNumber: '8471.30.00',
          quantity: 3,
          unitPrice: 95000,
          taxRate: 18,
          taxAmount: 51300,
          totalPrice: 336300,
          partNo: 'HP-EB-840G8'
        }],
        serviceCharges: [],
        subtotal: 285000,
        taxAmount: 51300,
        totalAmount: 336300,
        paidAmount: 100000,
        remainingAmount: 236300,
        paymentStatus: 'partial',
        notes: 'Laptops for sales team',
        terms: 'Payment within 30 days',
        createdBy: adminUser._id
      },
      {
        invoiceNumber: 'INV-2024-003',
        customer: customers[2]._id,
        user: adminUser._id,
        issueDate: new Date('2024-01-25'),
        dueDate: new Date('2024-02-24'),
        status: 'paid',
        invoiceType: 'sale',
        location: stockLocations[0]?._id,
        items: [{
          product: products[2]._id,
          description: 'Microsoft Office 365 Business Premium',
          hsnNumber: '9983.14.00',
          quantity: 20,
          unitPrice: 1200,
          taxRate: 18,
          taxAmount: 4320,
          totalPrice: 28320,
          partNo: 'MS-O365-BUS-PREM'
        }],
        serviceCharges: [],
        subtotal: 24000,
        taxAmount: 4320,
        totalAmount: 28320,
        paidAmount: 28320,
        remainingAmount: 0,
        paymentStatus: 'paid',
        notes: 'Software licenses for team',
        terms: 'Payment within 30 days',
        createdBy: adminUser._id
      }
    ];

    // Clear existing invoices
    await Invoice.deleteMany({});
    
    const createdInvoices = [];
    for (const invoiceData of invoicesData) {
      const invoice = new Invoice(invoiceData);
      await invoice.save();
      createdInvoices.push(invoice);
      console.log(`✅ Created invoice: ${invoice.invoiceNumber}`);
    }

    // 6. Create Sales Quotations
    console.log('\n📋 Creating sales quotations...');
    const salesQuotationsData = [
      {
        quotationNumber: 'SQ-2024-001',
        customer: customers[0]._id,
        issueDate: new Date('2024-01-10'),
        validUntil: new Date('2024-02-09'),
        status: 'sent',
        items: [{
          product: products[0]._id,
          description: 'Dell OptiPlex 7090 Desktop',
          hsnNumber: '8471.30.00',
          quantity: 5,
          unitPrice: 85000,
          discount: 5000,
          discountedAmount: 400000,
          taxRate: 18,
          taxAmount: 72000,
          totalPrice: 472000,
          partNo: 'DELL-OPT-7090'
        }],
        subtotal: 425000,
        totalDiscount: 25000,
        totalTax: 72000,
        grandTotal: 472000,
        notes: 'Desktop computers for new office setup',
        terms: 'Payment within 30 days of order confirmation',
        batteryBuyBack: {
          description: 'Battery Buy Back Service',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        },
        createdBy: adminUser._id
      },
      {
        quotationNumber: 'SQ-2024-002',
        customer: customers[1]._id,
        issueDate: new Date('2024-01-15'),
        validUntil: new Date('2024-02-14'),
        status: 'accepted',
        items: [{
          product: products[1]._id,
          description: 'HP EliteBook 840 G8 Laptop',
          hsnNumber: '8471.30.00',
          quantity: 8,
          unitPrice: 95000,
          discount: 8000,
          discountedAmount: 752000,
          taxRate: 18,
          taxAmount: 135360,
          totalPrice: 887360,
          partNo: 'HP-EB-840G8'
        }],
        subtotal: 760000,
        totalDiscount: 64000,
        totalTax: 135360,
        grandTotal: 831360,
        notes: 'Laptops for development team',
        terms: 'Payment within 30 days of order confirmation',
        batteryBuyBack: {
          description: 'Battery Buy Back Service',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        },
        createdBy: adminUser._id
      },
      {
        quotationNumber: 'SQ-2024-003',
        customer: customers[2]._id,
        issueDate: new Date('2024-01-20'),
        validUntil: new Date('2024-02-19'),
        status: 'sent',
        items: [{
          product: products[3]._id,
          description: 'Cisco Catalyst 2960 Switch',
          hsnNumber: '8517.62.00',
          quantity: 2,
          unitPrice: 45000,
          discount: 2000,
          discountedAmount: 88000,
          taxRate: 18,
          taxAmount: 15840,
          totalPrice: 103840,
          partNo: 'CISCO-2960-24TC'
        }],
        subtotal: 90000,
        totalDiscount: 4000,
        totalTax: 15840,
        grandTotal: 101840,
        notes: 'Network switches for office expansion',
        terms: 'Payment within 30 days of order confirmation',
        batteryBuyBack: {
          description: 'Battery Buy Back Service',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        },
        createdBy: adminUser._id
      },
      {
        quotationNumber: 'SQ-2024-004',
        customer: customers[3]._id,
        issueDate: new Date('2024-02-01'),
        validUntil: new Date('2024-03-02'),
        status: 'sent',
        items: [{
          product: products[4]._id,
          description: 'Lenovo ThinkPad X1 Carbon',
          hsnNumber: '8471.30.00',
          quantity: 3,
          unitPrice: 120000,
          discount: 10000,
          discountedAmount: 350000,
          taxRate: 18,
          taxAmount: 63000,
          totalPrice: 413000,
          partNo: 'LENOVO-X1-CARBON'
        }],
        subtotal: 360000,
        totalDiscount: 30000,
        totalTax: 63000,
        grandTotal: 393000,
        notes: 'Premium laptops for executive team',
        terms: 'Payment within 30 days of order confirmation',
        batteryBuyBack: {
          description: 'Battery Buy Back Service',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        },
        createdBy: adminUser._id
      },
      {
        quotationNumber: 'SQ-2024-005',
        customer: customers[4]._id,
        issueDate: new Date('2024-02-05'),
        validUntil: new Date('2024-03-06'),
        status: 'accepted',
        items: [{
          product: products[5]._id,
          description: 'Dell PowerEdge R750 Server',
          hsnNumber: '8471.30.00',
          quantity: 1,
          unitPrice: 450000,
          discount: 25000,
          discountedAmount: 425000,
          taxRate: 18,
          taxAmount: 76500,
          totalPrice: 501500,
          partNo: 'DELL-R750-SERVER'
        }],
        subtotal: 450000,
        totalDiscount: 25000,
        totalTax: 76500,
        grandTotal: 501500,
        notes: 'High-performance server for data center',
        terms: 'Payment within 30 days of order confirmation',
        batteryBuyBack: {
          description: 'Battery Buy Back Service',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        },
        createdBy: adminUser._id
      },
      {
        quotationNumber: 'SQ-2024-006',
        customer: customers[0]._id,
        issueDate: new Date('2024-02-10'),
        validUntil: new Date('2024-03-11'),
        status: 'sent',
        items: [{
          product: products[6]._id,
          description: 'HP LaserJet Pro M404dn Printer',
          hsnNumber: '8443.32.10',
          quantity: 4,
          unitPrice: 25000,
          discount: 2000,
          discountedAmount: 92000,
          taxRate: 18,
          taxAmount: 16560,
          totalPrice: 108560,
          partNo: 'HP-M404DN-PRINTER'
        }],
        subtotal: 100000,
        totalDiscount: 8000,
        totalTax: 16560,
        grandTotal: 108560,
        notes: 'Office printers for document management',
        terms: 'Payment within 30 days of order confirmation',
        batteryBuyBack: {
          description: 'Battery Buy Back Service',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        },
        createdBy: adminUser._id
      },
      {
        quotationNumber: 'SQ-2024-007',
        customer: customers[1]._id,
        issueDate: new Date('2024-02-15'),
        validUntil: new Date('2024-03-16'),
        status: 'draft',
        items: [{
          product: products[7]._id,
          description: 'Microsoft Office 365 Business Premium',
          hsnNumber: '9983.14.00',
          quantity: 10,
          unitPrice: 15000,
          discount: 1500,
          discountedAmount: 135000,
          taxRate: 18,
          taxAmount: 24300,
          totalPrice: 159300,
          partNo: 'MS-OFFICE-365-BP'
        }],
        subtotal: 150000,
        totalDiscount: 15000,
        totalTax: 24300,
        grandTotal: 159300,
        notes: 'Software licenses for productivity suite',
        terms: 'Payment within 30 days of order confirmation',
        batteryBuyBack: {
          description: 'Battery Buy Back Service',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        },
        createdBy: adminUser._id
      },
      {
        quotationNumber: 'SQ-2024-008',
        customer: customers[2]._id,
        issueDate: new Date('2024-02-20'),
        validUntil: new Date('2024-03-21'),
        status: 'sent',
        items: [{
          product: products[8]._id,
          description: 'Samsung 27" 4K Monitor',
          hsnNumber: '8528.72.00',
          quantity: 6,
          unitPrice: 35000,
          discount: 3000,
          discountedAmount: 192000,
          taxRate: 18,
          taxAmount: 34560,
          totalPrice: 226560,
          partNo: 'SAMSUNG-27-4K-MONITOR'
        }],
        subtotal: 210000,
        totalDiscount: 18000,
        totalTax: 34560,
        grandTotal: 226560,
        notes: 'High-resolution monitors for design team',
        terms: 'Payment within 30 days of order confirmation',
        batteryBuyBack: {
          description: 'Battery Buy Back Service',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        },
        createdBy: adminUser._id
      }
    ];

    // Clear existing quotations
    await Quotation.deleteMany({});
    
    const createdQuotations = [];
    for (const quotationData of salesQuotationsData) {
      const quotation = new Quotation(quotationData);
      await quotation.save();
      createdQuotations.push(quotation);
      console.log(`✅ Created sales quotation: ${quotation.quotationNumber}`);
    }

    // 7. Create Purchase Orders from Customers
    console.log('\n📋 Creating purchase orders from customers...');
    const customerPOsData = [
      {
        poNumber: 'CPO-2024-001',
        customer: customers[0]._id,
        customerEmail: customers[0].email,
        customerAddress: {
          id: 1,
          address: customers[0].addresses?.[0]?.address || '123 Industrial Area, Bangalore',
          state: 'Karnataka',
          district: 'Bangalore Urban',
          pincode: '560001',
          gstNumber: customers[0].addresses?.[0]?.gstNumber || '29CUST1234A1Z5',
          isPrimary: true
        },
        orderDate: new Date('2024-01-12'),
        expectedDeliveryDate: new Date('2026-01-27'),
        status: 'draft',
        department: 'retail',
        items: [{
          product: products[0]._id,
          description: 'Dell OptiPlex 7090 Desktop',
          quantity: 3,
          unitPrice: 85000,
          taxRate: 18,
          totalPrice: 300900,
          hsnNumber: '8471.30.00'
        }],
        totalAmount: 300900,
        paidAmount: 0,
        remainingAmount: 300900,
        paymentStatus: 'pending',
        notes: 'Desktop computers for new branch office',
        createdBy: adminUser._id
      },
      {
        poNumber: 'CPO-2024-002',
        customer: customers[1]._id,
        customerEmail: customers[1].email,
        customerAddress: {
          id: 1,
          address: customers[1].addresses?.[0]?.address || '456 Tech Park, Mumbai',
          state: 'Maharashtra',
          district: 'Mumbai',
          pincode: '400001',
          gstNumber: customers[1].addresses?.[0]?.gstNumber || '27CUST1234B1Z6',
          isPrimary: true
        },
        orderDate: new Date('2024-01-18'),
        expectedDeliveryDate: new Date('2026-02-02'),
        status: 'customer_approved',
        department: 'corporate',
        items: [{
          product: products[1]._id,
          description: 'HP EliteBook 840 G8 Laptop',
          quantity: 6,
          unitPrice: 95000,
          taxRate: 18,
          totalPrice: 672600,
          hsnNumber: '8471.30.00'
        }],
        totalAmount: 672600,
        paidAmount: 200000,
        remainingAmount: 472600,
        paymentStatus: 'partial',
        notes: 'Laptops for remote team members',
        createdBy: adminUser._id
      }
    ];

    // Clear existing customer purchase orders
    await POFromCustomer.deleteMany({});
    
    const createdCustomerPOs = [];
    for (const poData of customerPOsData) {
      const po = new POFromCustomer(poData);
      await po.save();
      createdCustomerPOs.push(po);
      console.log(`✅ Created customer purchase order: ${po.poNumber}`);
    }

    // 8. Create Digital Service Reports
    console.log('\n📊 Creating digital service reports...');
    const serviceReportsData = [
      {
        ticketId: createdServiceTickets[0]._id,
        reportNumber: 'DSR-2024-001',
        technician: fieldEngineers[0]?._id || adminUser._id,
        customer: customers[0]._id,
        product: products[0]._id,
        serviceDate: new Date('2024-01-16'),
        workCompleted: 'Replaced faulty fuel pump and cleaned fuel lines. Engine now running smoothly. All tests passed.',
        partsUsed: [{
          product: products[0]._id,
          quantity: 1,
          serialNumbers: ['FP-001-2024'],
          cost: 15000
        }],
        recommendations: 'Schedule next preventive maintenance in 3 months. Monitor fuel system performance.',
        customerFeedback: 'Excellent service. Engineer was professional and resolved the issue quickly.',
        customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        technicianSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        nextVisitRequired: true,
        nextVisitDate: new Date('2024-04-16'),
        serviceQuality: 'excellent',
        customerSatisfaction: 5,
        photos: ['https://example.com/service-photo-1.jpg'],
        attachments: ['https://example.com/service-report.pdf'],
        status: 'completed',
        approvedBy: adminUser._id
      },
      {
        ticketId: createdServiceTickets[1]._id,
        reportNumber: 'DSR-2024-002',
        technician: fieldEngineers[1]?._id || adminUser._id,
        customer: customers[1]._id,
        product: products[1]._id,
        serviceDate: new Date('2024-01-21'),
        workCompleted: 'Completed oil change, filter replacement, and general inspection. All systems functioning normally.',
        partsUsed: [{
          product: products[1]._id,
          quantity: 2,
          serialNumbers: ['OF-001-2024', 'OF-002-2024'],
          cost: 8000
        }],
        recommendations: 'Continue regular maintenance schedule. Engine performance is excellent.',
        customerFeedback: 'Good service. All work completed as scheduled.',
        customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        technicianSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        nextVisitRequired: true,
        nextVisitDate: new Date('2024-02-21'),
        serviceQuality: 'good',
        customerSatisfaction: 4,
        photos: ['https://example.com/service-photo-2.jpg'],
        attachments: [],
        status: 'completed',
        approvedBy: adminUser._id
      }
    ];

    // Clear existing service reports
    await DigitalServiceReport.deleteMany({});
    
    const createdServiceReports = [];
    for (const reportData of serviceReportsData) {
      const report = new DigitalServiceReport(reportData);
      await report.save();
      createdServiceReports.push(report);
      console.log(`✅ Created digital service report: ${report.reportNumber}`);
    }

    // Summary
    console.log('\n🎉 Business modules seed data creation completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Service Tickets: ${createdServiceTickets.length}`);
    console.log(`  - AMC Contracts: ${createdAMCs.length}`);
    console.log(`  - AMC Quotations: ${createdAMCQuotations.length}`);
    console.log(`  - Purchase Orders: ${createdPurchaseOrders.length}`);
    console.log(`  - Invoices: ${createdInvoices.length}`);
    console.log(`  - Sales Quotations: ${createdQuotations.length}`);
    console.log(`  - Customer Purchase Orders: ${createdCustomerPOs.length}`);
    console.log(`  - Digital Service Reports: ${createdServiceReports.length}`);

  } catch (error) {
    console.error('❌ Business modules seed data creation failed:', error);
    throw error;
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the seed function
createBusinessModulesSeedData()
  .then(() => {
    console.log('✅ Business modules seed data creation script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Business modules seed data creation script failed:', error);
    process.exit(1);
  });
