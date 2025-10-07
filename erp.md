Sun Power Services
Engineering Documentation
For Sun Power Services, we are developing an ERP system application to manage
their clients, Leads, employees, and finances.
Modules Included in the Application:
User Management
Customer Relationship Management
Inventory Management
Service Management
Annual Maintenance Contracts
Reports and Analytics
Admin Settings & Configurations
Third-Party Application Integration
Finance
Users Roles Included in the System:
Super Admin → Maintains the Overall application
Admin → Have the Superset access of the super admin
HR → Have access to the User management, Inventory Management, and
Finance
Manager → has access to all the modules except the admin settings and
Configuration
Viewer → The role can be configurable, based on the user's role in the
organization, they can give access to the specific modules for viewing and
Sun Power Services 1
writing
Modules Description:
1. User Management:
Role-based access control (RBAC)
Traditional Operations: Create, Update, and Delete a user
Configuring the user for access to the module
Attendance & activity logs (optionally from PagarBook)
2. Customer Relationship Management
Lead Management (capture, qualify, assign)
Customer Profiles (Retail / Telecom)
Contact History (calls, meetings)
Follow-ups & reminders
Status pipeline (Lead → Customer → Repeat)
3. Inventory Management
Product master (Gensets, spare parts, accessories)
Stock locations (main office, warehouses)
Inward/Outward stock ledger
Purchase Orders, Delivery Notes
Serial number/barcode tracking
Stock reconciliation and adjustments
4. Service Management
Ticket creation
Digital service reports (with customer signature)
SLA & response time tracking
Sun Power Services 2
Parts usage during service
5. Annual Maintenance Contracts
AMC registration (duration, visits, contract value)
Auto-generation of scheduled visits
AMC reminders (expiring contracts)
AMC-specific ticketing & reports
Genset-wise service history
6. Reporting & Analytics
Ticket closure TAT (turnaround time)
Inventory value / movement summary
Revenue tracking per client type (via Tally)
AMC due / expired status
Sales lead conversion metrics
Field engineer performance
7. Admin Settings & Configurations
Master Data: Product categories, locations, SLA times
User & role creation
Email/SMS/WhatsApp config
Data import/export (CSV/Excel)
Tech Stack Architecture:
Sun Power Services 3
Frontend Frameworks: React
Backend Frameworks: Node
Database Server: MongoDB
Sun Power Services 4