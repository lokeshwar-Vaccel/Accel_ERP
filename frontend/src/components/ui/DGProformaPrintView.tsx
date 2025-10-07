import React from 'react';

interface DGProformaPrintViewProps {
  proforma: any;
}

const DGProformaPrintView: React.FC<DGProformaPrintViewProps> = ({ proforma }) => {
  if (!proforma) {
    console.log('DGProformaPrintView: No proforma data provided');
    return <div>No proforma data available</div>;
  }

  console.log('DGProformaPrintView: Rendering proforma', proforma);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const numberToWords = (num: number) => {
    // Enhanced number to words conversion for Indian currency
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const tensAndOnes = num % 100;
    
    let result = '';
    
    if (crores > 0) {
      result += ones[crores] + ' Crore ';
    }
    if (lakhs > 0) {
      result += ones[lakhs] + ' Lakh ';
    }
    if (thousands > 0) {
      result += ones[thousands] + ' Thousand ';
    }
    if (hundreds > 0) {
      result += ones[hundreds] + ' Hundred ';
    }
    if (tensAndOnes > 0) {
      if (tensAndOnes < 10) {
        result += ones[tensAndOnes];
      } else if (tensAndOnes < 20) {
        result += teens[tensAndOnes - 10];
      } else {
        result += tens[Math.floor(tensAndOnes / 10)] + ' ' + ones[tensAndOnes % 10];
      }
    }
    
    return result.trim() + ' Only';
  };

  return (
    <div className="print-container" style={{ 
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      lineHeight: '1.4',
      color: '#000',
      backgroundColor: '#fff',
      padding: '20px',
      maxWidth: '210mm',
      margin: '0 auto'
    }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        {/* Company Info */}
        <div style={{ width: '50%' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: '#000'
          }}>
            Sun Power Services
          </h1>
          <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
            <p>D No.53, Plot No.4, 4th Street, Phase-1 Extension,</p>
            <p>Annai Velankanni Nagar, Madhananthapuram, Porur,</p>
            <p>Chennai - 600116</p>
            <p style={{ marginTop: '8px' }}>Phone Numbers: 044-24828218, 9176660123</p>
            <p>GSTIN/UIN: 33BLFPS9951M1ZC</p>
            <p>State Name: Tamil Nadu, Code: 33</p>
            <p>E-Mail: sunpowerservices@gmail.com</p>
          </div>
        </div>

        {/* Invoice Details */}
        <div style={{ width: '50%' }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            textAlign: 'center',
            marginBottom: '16px',
            color: '#000'
          }}>
            PROFORMA INVOICE
          </h2>
          <table style={{ 
            width: '100%', 
            border: '1px solid #000',
            borderCollapse: 'collapse',
            fontSize: '11px'
          }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Invoice No.:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{proforma.proformaNumber || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Dated:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{formatDate(proforma.proformaDate)}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Delivery Note:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{proforma.deliveryNotes || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Mode/Terms of Payment:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{proforma.paymentTerms || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Reference No. & Date:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>
                  {proforma.referenceNumber ? `${proforma.referenceNumber} ${formatDate(proforma.referenceDate)}` : ''}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Other References:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>
                  {typeof proforma.dgQuotationNumber === 'object' ? proforma.dgQuotationNumber?.quotationNumber || '' : proforma.dgQuotationNumber || ''}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Buyer's Order No.:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{proforma.buyersOrderNumber || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Dated:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{formatDate(proforma.buyersOrderDate)}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Dispatch Doc No.:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{proforma.dispatchDocNo || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Delivery Note Date:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{formatDate(proforma.deliveryNoteDate)}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Dispatched through:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{proforma.dispatchedThrough || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Destination:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{proforma.destination || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Terms of Delivery:</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{proforma.termsOfDelivery || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Consignee and Buyer Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        {/* Consignee (Ship to) */}
        <div style={{ width: '48%' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Consignee (Ship to)</h3>
          <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', width: '300px' }}>
              {proforma.shippingAddress?.address || 'N/A'}
            </p>
            <p>{proforma.shippingAddress?.district || ''}</p>
            <p>{proforma.shippingAddress?.state || ''} - {proforma.shippingAddress?.pincode || ''}</p>
            <p>GSTIN/UIN: {proforma.shippingAddress?.gstNumber || 'N/A'}</p>
            <p>State Name: {proforma.shippingAddress?.state || 'N/A'}, Code: 29</p>
          </div>
        </div>

        {/* Buyer (Bill to) */}
        <div style={{ width: '48%' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Buyer (Bill to)</h3>
          <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold' }}>{proforma.customer?.name || 'N/A'}</p>
            <p style={{ width: '300px' }}>{proforma.billingAddress?.address || 'N/A'}</p>
            <p>{proforma.billingAddress?.district || ''}</p>
            <p>{proforma.billingAddress?.state || ''} - {proforma.billingAddress?.pincode || ''}</p>
            <p>GSTIN/UIN: {proforma.billingAddress?.gstNumber || 'N/A'}</p>
            <p>State Name: {proforma.billingAddress?.state || 'N/A'}, Code: 33</p>
            <p>Place of Supply: {proforma.billingAddress?.state || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '20px' }}>
        <table style={{ 
          width: '100%', 
          border: '1px solid #000',
          borderCollapse: 'collapse',
          fontSize: '11px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>
                Description of Goods and Services
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                HSN/SAC
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                GST Rate
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Quantity
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Rate
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                per
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Disc. %
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {proforma.items?.map((item: any, index: number) => (
              <tr key={index}>
                <td style={{ border: '1px solid #000', padding: '8px' }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {item.kva} KVA Mahindra Powerol Diesel Genset
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    Including of Transport & Unloading Charges
                  </div>
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {item.hsnNumber || '85021100'}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {item.gstRate || 18}%
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {formatNumber(item.quantity || 0)} Nos.
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {formatNumber(item.unitPrice || 0)}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  Nos.
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {item.discount || 0}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatNumber(item.totalPrice || 0)}
                </td>
              </tr>
            ))}
            
            {/* Transport Charges Row */}
            {proforma.transportCharges && proforma.transportCharges.unitPrice > 0 && (
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>
                  <div style={{ fontWeight: 'bold' }}>Transport Charges</div>
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {proforma.transportCharges.hsnNumber || '998399'}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {proforma.transportCharges.gstRate || 18}%
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {formatNumber(proforma.transportCharges.quantity || 0)} Nos.
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  {formatNumber(proforma.transportCharges.unitPrice || 0)}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  Nos.
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                  0
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatNumber(proforma.transportCharges.amount || 0)}
                </td>
              </tr>
            )}
            
            {/* Subtotal Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }} colSpan={7}>
                Subtotal
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber(proforma.subtotal || 0)}
              </td>
            </tr>
            
            {/* Tax Rows */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }} colSpan={7}>
                OUTPUT SGST
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber((proforma.taxAmount || 0) / 2)}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }} colSpan={7}>
                OUTPUT CGST
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber((proforma.taxAmount || 0) / 2)}
              </td>
            </tr>
            
            {/* Total Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }} colSpan={3}>
                Total
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                {proforma.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)} Nos.
              </td>
              <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}></td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                ₹ {formatNumber(proforma.totalAmount || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in Words */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '12px', fontWeight: 'bold' }}>
          <span style={{ fontWeight: 'bold' }}>Amount Chargeable (in words):</span> Indian Rupees {numberToWords(Math.round(proforma.totalAmount || 0))}
        </p>
      </div>

      {/* Tax Details Table */}
      <div style={{ marginBottom: '20px' }}>
        <table style={{ 
          width: '100%', 
          border: '1px solid #000',
          borderCollapse: 'collapse',
          fontSize: '11px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                HSN/SAC
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Taxable Value
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }} colSpan={2}>
                CGST
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }} colSpan={2}>
                SGST/UTGST
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Total Tax Amount
              </th>
            </tr>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}></th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}></th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Rate
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Amount
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Rate
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                Amount
              </th>
              <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}></th>
            </tr>
          </thead>
          <tbody>
            {proforma.items?.map((item: any, index: number) => {
              // Calculate taxable value after discount
              const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
              const discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
              const taxableValue = itemSubtotal - discountAmount;
              const gstAmount = (taxableValue * (item.gstRate || 18)) / 100;
              
              return (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {item.hsnNumber || '85021100'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {formatNumber(taxableValue)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {Math.round((item.gstRate || 18) / 2)}%
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {formatNumber(gstAmount / 2)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {Math.round((item.gstRate || 18) / 2)}%
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {formatNumber(gstAmount / 2)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {formatNumber(gstAmount)}
                  </td>
                </tr>
              );
            })}
            
            {/* Transport Charges Tax Row */}
            {proforma.transportCharges && proforma.transportCharges.unitPrice > 0 && (() => {
              const transportTaxableValue = proforma.transportCharges.amount || 0;
              const transportGstAmount = proforma.transportCharges.gstAmount || 0;
              
              return (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {proforma.transportCharges.hsnNumber || '998399'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {formatNumber(transportTaxableValue)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {Math.round((proforma.transportCharges.gstRate || 18) / 2)}%
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {formatNumber(transportGstAmount / 2)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {Math.round((proforma.transportCharges.gstRate || 18) / 2)}%
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {formatNumber(transportGstAmount / 2)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    {formatNumber(transportGstAmount)}
                  </td>
                </tr>
              );
            })()}
            
            <tr style={{ fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Total</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                {formatNumber(proforma.subtotal || 0)}
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}></td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                {formatNumber((proforma.taxAmount || 0) / 2)}
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}></td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                {formatNumber((proforma.taxAmount || 0) / 2)}
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                {formatNumber(proforma.taxAmount || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tax Amount in Words */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '12px', fontWeight: 'bold' }}>
          <span style={{ fontWeight: 'bold' }}>Tax Amount (in words):</span> Indian Rupees {numberToWords(Math.round(proforma.taxAmount || 0))}
        </p>
      </div>

      {/* Bank Details */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          <p><span style={{ fontWeight: 'bold' }}>Company's PAN:</span> BLFPS9951M</p>
          <p><span style={{ fontWeight: 'bold' }}>Company's Bank Details:</span></p>
          <p><span style={{ fontWeight: 'bold' }}>Bank Name:</span> Hdfc Bank A/c No: 50200051862959</p>
          <p><span style={{ fontWeight: 'bold' }}>A/c No.:</span> 50200051862959</p>
          <p><span style={{ fontWeight: 'bold' }}>Branch & IFS Code:</span> Moulivakkam & HDFC0005281</p>
        </div>
      </div>

      {/* Declaration */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '12px', fontStyle: 'italic' }}>
          "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
        </p>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '12px' }}>
          <p style={{ fontWeight: 'bold' }}>for Sun Power Services</p>
          <p style={{ marginTop: '32px' }}>Authorised Signatory</p>
        </div>
        <div style={{ fontSize: '10px', color: '#666' }}>
          <p>This is a Computer Generated Invoice</p>
          <p style={{ marginTop: '4px' }}>E. & O.E</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print-container {
            margin: 0 !important;
            padding: 10mm !important;
            max-width: none !important;
            font-size: 11px !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          @page {
            margin: 10mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};

export default DGProformaPrintView;
