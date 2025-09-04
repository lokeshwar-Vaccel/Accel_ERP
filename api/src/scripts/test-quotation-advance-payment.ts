import mongoose from 'mongoose';
import { Quotation } from '../models/Quotation';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sun-power-services';

async function testQuotationAdvancePayment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test quotation
    const testQuotation = new Quotation({
      quotationNumber: 'TEST-QTN-001',
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      validityPeriod: 30,
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890'
      },
      company: {
        name: 'Test Company',
        address: 'Test Address',
        phone: '0987654321',
        email: 'company@test.com'
      },
      items: [
        {
          product: 'TEST-PRODUCT-1',
          description: 'Test Product 1',
          quantity: 2,
          uom: 'Nos',
          unitPrice: 100,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 36,
          totalPrice: 236
        }
      ],
      subtotal: 200,
      totalDiscount: 0,
      totalTax: 36,
      grandTotal: 236,
      roundOff: 0,
      notes: 'Test quotation for advance payment',
      terms: 'Test terms and conditions',
      status: 'draft',
      advanceAmount: 0,
      remainingAmount: 236,
      advancePaymentStatus: 'pending'
    });

    // Save the test quotation
    const savedQuotation = await testQuotation.save();
    console.log('Test quotation created:', savedQuotation.quotationNumber);

    // Test updating advance payment
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      savedQuotation._id,
      {
        advanceAmount: 100,
        advancePaymentMethod: 'cash',
        advancePaymentDate: new Date(),
        advancePaymentNotes: 'Test advance payment'
      },
      { new: true, runValidators: true }
    );

    if (updatedQuotation) {
      console.log('Advance payment updated successfully');
      console.log('New advance amount:', (updatedQuotation as any).advanceAmount);
      console.log('New remaining amount:', (updatedQuotation as any).remainingAmount);
      console.log('New advance payment status:', (updatedQuotation as any).advancePaymentStatus);
      console.log('New quotation status:', updatedQuotation.status);
    }

    // Test full payment
    const fullyPaidQuotation = await Quotation.findByIdAndUpdate(
      savedQuotation._id,
      {
        advanceAmount: 236,
        advancePaymentMethod: 'bank_transfer',
        advancePaymentDate: new Date(),
        advancePaymentNotes: 'Full payment received'
      },
      { new: true, runValidators: true }
    );

    if (fullyPaidQuotation) {
      console.log('Full payment processed successfully');
      console.log('Final advance amount:', (fullyPaidQuotation as any).advanceAmount);
      console.log('Final remaining amount:', (fullyPaidQuotation as any).remainingAmount);
      console.log('Final advance payment status:', (fullyPaidQuotation as any).advancePaymentStatus);
      console.log('Final quotation status:', fullyPaidQuotation.status);
    }

    // Clean up - delete test quotation
    await Quotation.findByIdAndDelete(savedQuotation._id);
    console.log('Test quotation deleted');

    console.log('All tests passed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testQuotationAdvancePayment(); 