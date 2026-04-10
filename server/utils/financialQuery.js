const MONTH_NAME_TO_NUMBER = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

const MONTH_NUMBER_TO_NAME = Object.fromEntries(
  Object.entries(MONTH_NAME_TO_NUMBER).map(([name, number]) => [
    number,
    name.charAt(0).toUpperCase() + name.slice(1)
  ])
);

// 🔥 Improved keywords
const BREAKDOWN_KEYWORDS = [
  'source',
  'breakdown',
  'from',
  'by department',
  'department-wise',
  'per department',
  'each department',
  'where'
];

const TOTAL_KEYWORDS = [
  'total',
  'sum',
  'overall',
  'aggregate',
  'how much',
  'spent',
  'cost',
  'amount'
];

// 🔹 Normalize
function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

// 🔹 Month detection
function findMonth(query) {
  for (const [name, number] of Object.entries(MONTH_NAME_TO_NUMBER)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(query)) return number;
  }
  return null;
}

// 🔥 IMPROVED TYPE DETECTION
function findType(query) {
  // Income words
  if (
    /\bincome\b|\bearn\b|\bearning\b|\brevenue\b|\bprofit\b/i.test(query)
  ) {
    return 'Income';
  }

  // Expense words
  if (
    /\bexpense\b|\bspend\b|\bspent\b|\bcost\b|\bexpense\b/i.test(query)
  ) {
    return 'Expense';
  }

  return null;
}

// 🔹 Breakdown
function wantsBreakdown(query) {
  return BREAKDOWN_KEYWORDS.some(keyword => query.includes(keyword));
}

// 🔹 Total
function wantsTotal(query) {
  return TOTAL_KEYWORDS.some(keyword => query.includes(keyword));
}

// 🔥 MAIN PARSER (UPDATED)
function parseNaturalLanguageQuery(query) {
  if (!query || typeof query !== 'string') return null;

  const normalizedQuery = normalizeQuery(query);

  const month = findMonth(normalizedQuery);
  let type = findType(normalizedQuery);

  let breakdown = wantsBreakdown(normalizedQuery);
  const total = wantsTotal(normalizedQuery);

  // 🔥 Smart defaults
  if (!type) {
    if (normalizedQuery.includes('spend') || normalizedQuery.includes('spent')) {
      type = 'Expense';
    } else if (normalizedQuery.includes('earn')) {
      type = 'Income';
    }
  }

  // 🔥 If user asks breakdown → true
  if (breakdown) {
    breakdown = true;
  }
  // 🔥 If user asks total → false
  else if (total) {
    breakdown = false;
  }
  // 🔥 Default behavior
  else {
    breakdown = type === 'Income'; // income → breakdown, expense → total
  }

  return {
    month,
    type,
    breakdown,
    originalQuery: query.trim()
  };
}

// 🔹 Currency format
function formatCurrency(amount) {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });
  return formatter.format(amount);
}

// 🔹 Join list
function joinList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// 🔥 FINAL RESPONSE FORMATTER
function formatFinancialResponse({ month, type, breakdown, aggregatedRows }) {
  const monthName = MONTH_NUMBER_TO_NAME[month] || 'That month';
  const normalizedType = type ? type.toLowerCase() : 'records';

  if (!Array.isArray(aggregatedRows) || aggregatedRows.length === 0) {
    return `In ${monthName}, no ${normalizedType} data was found.`;
  }

  // ✅ Breakdown response
  if (breakdown) {
    const breakdownItems = aggregatedRows.map(row => {
      const department = row._id || 'Uncategorized';
      const amount = formatCurrency(row.totalAmount);
      return `${department} (${amount})`;
    });

    return `In ${monthName}, your ${normalizedType} came from ${joinList(breakdownItems)}.`;
  }

  // ✅ Total response
  const totalAmount = aggregatedRows[0].totalAmount || 0;
  return `In ${monthName}, your total ${normalizedType} was ${formatCurrency(totalAmount)}.`;
}

module.exports = {
  parseNaturalLanguageQuery,
  formatFinancialResponse
};