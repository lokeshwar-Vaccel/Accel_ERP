"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validate = exports.querySchema = exports.updatePurchaseOrderSchema = exports.createPurchaseOrderSchema = exports.completeVisitSchema = exports.updateAMCSchema = exports.createAMCSchema = exports.addPartsUsedSchema = exports.updateServiceTicketSchema = exports.createServiceTicketSchema = exports.transferStockSchema = exports.updateStockSchema = exports.createStockLocationSchema = exports.updateProductSchema = exports.createProductSchema = exports.addContactHistorySchema = exports.updateCustomerSchema = exports.createCustomerSchema = exports.updateUserSchema = exports.changePasswordSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const types_1 = require("../types");
exports.registerSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(50).required(),
    lastName: joi_1.default.string().min(2).max(50).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    role: joi_1.default.string().valid(...Object.values(types_1.UserRole)),
    phone: joi_1.default.string().pattern(/^\+?[1-9]\d{1,14}$/),
    address: joi_1.default.string().max(200),
    moduleAccess: joi_1.default.array().items(joi_1.default.string())
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required()
});
exports.updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(50),
    lastName: joi_1.default.string().min(2).max(50),
    phone: joi_1.default.string().pattern(/^\+?[1-9]\d{1,14}$/),
    address: joi_1.default.string().max(200)
});
exports.changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(6).required()
});
exports.updateUserSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(50),
    lastName: joi_1.default.string().min(2).max(50),
    phone: joi_1.default.string().pattern(/^\+?[1-9]\d{1,14}$/),
    address: joi_1.default.string().max(200),
    role: joi_1.default.string().valid(...Object.values(types_1.UserRole)),
    status: joi_1.default.string().valid(...Object.values(types_1.UserStatus)),
    moduleAccess: joi_1.default.array().items(joi_1.default.string())
});
exports.createCustomerSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required(),
    email: joi_1.default.string().email(),
    phone: joi_1.default.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    address: joi_1.default.string().max(500).required(),
    customerType: joi_1.default.string().valid(...Object.values(types_1.CustomerType)).required(),
    leadSource: joi_1.default.string().max(100),
    assignedTo: joi_1.default.string(),
    status: joi_1.default.string().valid(...Object.values(types_1.LeadStatus)),
    notes: joi_1.default.string().max(2000)
});
exports.updateCustomerSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100),
    email: joi_1.default.string().email(),
    phone: joi_1.default.string().pattern(/^\+?[1-9]\d{1,14}$/),
    address: joi_1.default.string().max(500),
    customerType: joi_1.default.string().valid(...Object.values(types_1.CustomerType)),
    leadSource: joi_1.default.string().max(100),
    assignedTo: joi_1.default.string(),
    status: joi_1.default.string().valid(...Object.values(types_1.LeadStatus)),
    notes: joi_1.default.string().max(2000)
});
exports.addContactHistorySchema = joi_1.default.object({
    type: joi_1.default.string().valid('call', 'meeting', 'email', 'whatsapp').required(),
    date: joi_1.default.date().required(),
    notes: joi_1.default.string().max(1000).required(),
    followUpDate: joi_1.default.date()
});
exports.createProductSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(200).required(),
    description: joi_1.default.string().max(1000),
    category: joi_1.default.string().valid(...Object.values(types_1.ProductCategory)).required(),
    brand: joi_1.default.string().max(100),
    model: joi_1.default.string().max(100),
    specifications: joi_1.default.object(),
    price: joi_1.default.number().min(0).required(),
    minStockLevel: joi_1.default.number().min(0).required()
});
exports.updateProductSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(200),
    description: joi_1.default.string().max(1000),
    category: joi_1.default.string().valid(...Object.values(types_1.ProductCategory)),
    brand: joi_1.default.string().max(100),
    model: joi_1.default.string().max(100),
    specifications: joi_1.default.object(),
    price: joi_1.default.number().min(0),
    minStockLevel: joi_1.default.number().min(0),
    isActive: joi_1.default.boolean()
});
exports.createStockLocationSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required(),
    address: joi_1.default.string().max(500).required(),
    type: joi_1.default.string().valid('main_office', 'warehouse', 'service_center').required(),
    contactPerson: joi_1.default.string().max(100),
    phone: joi_1.default.string().pattern(/^\+?[1-9]\d{1,14}$/)
});
exports.updateStockSchema = joi_1.default.object({
    quantity: joi_1.default.number().min(0).required()
});
exports.transferStockSchema = joi_1.default.object({
    fromLocation: joi_1.default.string().required(),
    toLocation: joi_1.default.string().required(),
    quantity: joi_1.default.number().min(1).required(),
    notes: joi_1.default.string().max(500)
});
exports.createServiceTicketSchema = joi_1.default.object({
    customer: joi_1.default.string().required(),
    product: joi_1.default.string(),
    serialNumber: joi_1.default.string().max(100),
    description: joi_1.default.string().max(2000).required(),
    priority: joi_1.default.string().valid(...Object.values(types_1.TicketPriority)),
    assignedTo: joi_1.default.string(),
    scheduledDate: joi_1.default.date()
});
exports.updateServiceTicketSchema = joi_1.default.object({
    description: joi_1.default.string().max(2000),
    priority: joi_1.default.string().valid(...Object.values(types_1.TicketPriority)),
    status: joi_1.default.string().valid(...Object.values(types_1.TicketStatus)),
    assignedTo: joi_1.default.string(),
    scheduledDate: joi_1.default.date(),
    serviceReport: joi_1.default.string().max(5000),
    customerSignature: joi_1.default.string()
});
exports.addPartsUsedSchema = joi_1.default.object({
    product: joi_1.default.string().required(),
    quantity: joi_1.default.number().min(1).required(),
    serialNumbers: joi_1.default.array().items(joi_1.default.string())
});
exports.createAMCSchema = joi_1.default.object({
    customer: joi_1.default.string().required(),
    products: joi_1.default.array().items(joi_1.default.string()).min(1).required(),
    startDate: joi_1.default.date().required(),
    endDate: joi_1.default.date().greater(joi_1.default.ref('startDate')).required(),
    contractValue: joi_1.default.number().min(0).required(),
    scheduledVisits: joi_1.default.number().min(1).required(),
    terms: joi_1.default.string().max(5000)
});
exports.updateAMCSchema = joi_1.default.object({
    products: joi_1.default.array().items(joi_1.default.string()).min(1),
    startDate: joi_1.default.date(),
    endDate: joi_1.default.date(),
    contractValue: joi_1.default.number().min(0),
    scheduledVisits: joi_1.default.number().min(1),
    status: joi_1.default.string().valid(...Object.values(types_1.AMCStatus)),
    terms: joi_1.default.string().max(5000)
});
exports.completeVisitSchema = joi_1.default.object({
    visitId: joi_1.default.string().required(),
    completedDate: joi_1.default.date().required(),
    assignedTo: joi_1.default.string(),
    notes: joi_1.default.string().max(1000)
});
exports.createPurchaseOrderSchema = joi_1.default.object({
    supplier: joi_1.default.string().max(200).required(),
    items: joi_1.default.array().items(joi_1.default.object({
        product: joi_1.default.string().required(),
        quantity: joi_1.default.number().min(1).required(),
        unitPrice: joi_1.default.number().min(0).required()
    })).min(1).required(),
    expectedDeliveryDate: joi_1.default.date()
});
exports.updatePurchaseOrderSchema = joi_1.default.object({
    supplier: joi_1.default.string().max(200),
    expectedDeliveryDate: joi_1.default.date(),
    status: joi_1.default.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled')
});
exports.querySchema = joi_1.default.object({
    page: joi_1.default.number().min(1),
    limit: joi_1.default.number().min(1).max(100),
    sort: joi_1.default.string(),
    search: joi_1.default.string(),
    startDate: joi_1.default.date(),
    endDate: joi_1.default.date()
});
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }
        next();
    };
};
exports.validate = validate;
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Query validation error',
                error: error.details[0].message
            });
        }
        next();
    };
};
exports.validateQuery = validateQuery;
//# sourceMappingURL=validation.js.map