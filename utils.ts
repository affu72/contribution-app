
/**
 * Formats a number as currency (USD)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Utility function demo: Calculates total contributions
 * This includes a basic test case conceptualization in comments.
 */
export const calculateTotal = (amounts: number[]): number => {
  return amounts.reduce((acc, curr) => acc + curr, 0);
};

/**
 * TEST CASE DEMONSTRATION:
 * Function: calculateTotal([10, 20, 30])
 * Expected Output: 60
 * 
 * Function: formatCurrency(1250.5)
 * Expected Output: "$1,250.50"
 */
