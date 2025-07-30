import { apiClient } from './api';

export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ')
}

// Convert number to words in Indian currency format
export const numberToWords = (amount: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

  const convertLessThanOneThousand = (num: number): string => {
    if (num === 0) return '';

    let result = '';

    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }

    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + ' ';
      return result;
    }

    if (num > 0) {
      result += ones[num] + ' ';
    }

    return result;
  };

  const convertToWords = (num: number): string => {
    if (num === 0) return 'Zero';

    let result = '';
    let groupIndex = 0;

    while (num > 0) {
      const group = num % 1000;
      if (group !== 0) {
        const groupWords = convertLessThanOneThousand(group);
        if (groupIndex > 0) {
          result = groupWords + thousands[groupIndex] + ' ' + result;
        } else {
          result = groupWords;
        }
      }
      num = Math.floor(num / 1000);
      groupIndex++;
    }

    return result.trim();
  };

  // Handle decimal part (paise)
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = convertToWords(rupees) + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertToWords(paise) + ' Paise';
  }

  return result + ' Only';
};

// Field Operators API utility
export const fetchFieldOperators = async () => {
  try {
    const response = await apiClient.users.getFieldOperators();
    if (response.success && response.data.fieldOperators) {
      return response.data.fieldOperators.map((operator: any) => ({
        value: operator.id,
        label: operator.name,
        email: operator.email,
        phone: operator.phone
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching field operators:', error);
    return [];
  }
};
