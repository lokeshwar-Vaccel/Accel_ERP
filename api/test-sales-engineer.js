const { createDGQuotationSchema } = require('./dist/schemas/dgQuotationSchemas');

// Test data with salesEngineer field
const testData = {
  quotationNumber: "TEST-001",
  issueDate: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  quotationRevisionNo: "01",
  customer: {
    name: "Test Customer",
    email: "test@example.com",
    phone: "1234567890"
  },
  dgSpecifications: {
    kva: "10",
    phase: "3",
    quantity: 1
  },
  dgItems: [],
  subtotal: 100,
  totalDiscount: 0,
  totalTax: 18,
  grandTotal: 118,
  salesEngineer: {
    _id: "test-id",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    salesEmployeeCode: "SE001"
  }
};

console.log('🧪 Testing DG Quotation schema with salesEngineer field...');
console.log('📋 Test data includes salesEngineer:', !!testData.salesEngineer);

const { error, value } = createDGQuotationSchema.validate(testData);

if (error) {
  console.log('❌ Validation failed:');
  console.log('   Error:', error.details[0].message);
  console.log('   Field:', error.details[0].path.join('.'));
} else {
  console.log('✅ Validation passed! salesEngineer field is accepted.');
  console.log('📊 Validated salesEngineer data:');
  console.log('   Name:', value.salesEngineer.fullName);
  console.log('   Email:', value.salesEngineer.email);
  console.log('   Code:', value.salesEngineer.salesEmployeeCode);
}
