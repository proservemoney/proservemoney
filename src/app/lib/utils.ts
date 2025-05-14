/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (default: 'INR')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | string): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

/**
 * Format a date
 * @param date The date to format
 * @returns Formatted date string (DD MMM YYYY)
 */
export function formatDate(date: Date | string): string {
  if (!date) return 'N/A';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date with time
 * @param date The date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return 'N/A';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate a string and add ellipsis
 * @param str The string to truncate
 * @param length Maximum length (default: 50)
 * @returns Truncated string
 */
export function truncateString(str: string, length: number = 50): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
} 