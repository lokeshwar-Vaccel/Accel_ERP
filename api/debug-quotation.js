const mongoose = require('mongoose');
const { DGQuotation } = require('./dist/models/DGQuotation');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sun-power-erp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugQuotation(quotationId) {
  try {
    console.log('Debugging quotation:', quotationId);
    
    const quotation = await DGQuotation.findById(quotationId);
    if (!quotation) {
      console.log('Quotation not found');
      return;
    }
    
    console.log('Quotation data:', {
      _id: quotation._id,
      quotationNumber: quotation.quotationNumber,
      grandTotal: quotation.grandTotal,
      paidAmount: quotation.paidAmount,
      remainingAmount: quotation.remainingAmount,
      status: quotation.status,
      dgItems: quotation.dgItems?.length || 0,
      services: quotation.services?.length || 0
    });
    
    // Calculate what the remaining amount should be
    const calculatedRemaining = Math.max(0, (quotation.grandTotal || 0) - (quotation.paidAmount || 0));
    console.log('Calculated remaining amount:', calculatedRemaining);
    console.log('Stored remaining amount:', quotation.remainingAmount);
    console.log('Match:', calculatedRemaining === quotation.remainingAmount);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Get quotation ID from command line argument
const quotationId = process.argv[2];
if (!quotationId) {
  console.log('Usage: node debug-quotation.js <quotationId>');
  process.exit(1);
}

debugQuotation(quotationId);
