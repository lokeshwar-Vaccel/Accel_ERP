"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCategory = exports.StockTransactionType = exports.AMCStatus = exports.TicketPriority = exports.TicketStatus = exports.LeadStatus = exports.CustomerType = exports.UserStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["ADMIN"] = "admin";
    UserRole["HR"] = "hr";
    UserRole["MANAGER"] = "manager";
    UserRole["VIEWER"] = "viewer";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var CustomerType;
(function (CustomerType) {
    CustomerType["RETAIL"] = "retail";
    CustomerType["TELECOM"] = "telecom";
})(CustomerType || (exports.CustomerType = CustomerType = {}));
var LeadStatus;
(function (LeadStatus) {
    LeadStatus["NEW"] = "new";
    LeadStatus["QUALIFIED"] = "qualified";
    LeadStatus["CONTACTED"] = "contacted";
    LeadStatus["CONVERTED"] = "converted";
    LeadStatus["LOST"] = "lost";
})(LeadStatus || (exports.LeadStatus = LeadStatus = {}));
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["OPEN"] = "open";
    TicketStatus["IN_PROGRESS"] = "in_progress";
    TicketStatus["RESOLVED"] = "resolved";
    TicketStatus["CLOSED"] = "closed";
    TicketStatus["CANCELLED"] = "cancelled";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var TicketPriority;
(function (TicketPriority) {
    TicketPriority["LOW"] = "low";
    TicketPriority["MEDIUM"] = "medium";
    TicketPriority["HIGH"] = "high";
    TicketPriority["CRITICAL"] = "critical";
})(TicketPriority || (exports.TicketPriority = TicketPriority = {}));
var AMCStatus;
(function (AMCStatus) {
    AMCStatus["ACTIVE"] = "active";
    AMCStatus["EXPIRED"] = "expired";
    AMCStatus["CANCELLED"] = "cancelled";
    AMCStatus["PENDING"] = "pending";
})(AMCStatus || (exports.AMCStatus = AMCStatus = {}));
var StockTransactionType;
(function (StockTransactionType) {
    StockTransactionType["INWARD"] = "inward";
    StockTransactionType["OUTWARD"] = "outward";
    StockTransactionType["ADJUSTMENT"] = "adjustment";
    StockTransactionType["TRANSFER"] = "transfer";
})(StockTransactionType || (exports.StockTransactionType = StockTransactionType = {}));
var ProductCategory;
(function (ProductCategory) {
    ProductCategory["GENSET"] = "genset";
    ProductCategory["SPARE_PART"] = "spare_part";
    ProductCategory["ACCESSORY"] = "accessory";
})(ProductCategory || (exports.ProductCategory = ProductCategory = {}));
//# sourceMappingURL=index.js.map