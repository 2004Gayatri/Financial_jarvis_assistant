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

const GROUPABLE_FIELDS = [
  { key: 'client', labels: ['source', 'sources', 'from whom', 'who paid', 'clients', 'companies', 'company'] },
  { key: 'department', labels: ['department', 'team'] },
  { key: 'category', labels: ['category', 'categories', 'head'] },
  { key: 'client', labels: ['client', 'customer'] },
  { key: 'project', labels: ['project', 'projects'] },
  { key: 'status', labels: ['status'] },
  { key: 'month', labels: ['month', 'months'] },
  { key: 'type', labels: ['type', 'types'] }
];

const FIELD_LABELS = {
  client: 'income source',
  category: 'category',
  department: 'department',
  project: 'project',
  status: 'status',
  month: 'month',
  type: 'type'
};

function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

function findMonth(query) {
  for (const [name, number] of Object.entries(MONTH_NAME_TO_NUMBER)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(query)) {
      return number;
    }
  }

  const numericMatch = query.match(/\b(?:month\s*)?(1[0-2]|[1-9])\b/);
  return numericMatch ? Number(numericMatch[1]) : null;
}

function findType(query) {
  if (/\b(income|earn|earning|revenue|profit|sale|sales)\b/i.test(query)) {
    return 'Income';
  }

  if (/\b(expense|expenses|spend|spent|cost|costs|purchase|purchases)\b/i.test(query)) {
    return 'Expense';
  }

  return null;
}

function findRequestedField(query, rows) {
  for (const field of GROUPABLE_FIELDS) {
    if (field.labels.some(label => query.includes(label))) {
      return field.key;
    }
  }

  const sampleValues = [];
  for (const row of rows.slice(0, 50)) {
    sampleValues.push(row.category, row.department, row.client, row.project, row.status);
  }

  const matchedValue = sampleValues
    .filter(Boolean)
    .find(value => query.includes(String(value).trim().toLowerCase()));

  if (!matchedValue) {
    return null;
  }

  const normalizedMatch = String(matchedValue).trim().toLowerCase();
  return ['category', 'department', 'client', 'project', 'status'].find(key =>
    rows.some(row => String(row[key] || '').trim().toLowerCase() === normalizedMatch)
  ) || null;
}

function findSpecificFilters(query, rows) {
  const filters = {};

  ['category', 'department', 'client', 'project', 'status'].forEach(field => {
    const uniqueValues = [...new Set(rows.map(row => row[field]).filter(Boolean))];
    const match = uniqueValues.find(value =>
      matchesQueryValue(query, value)
    );

    if (match) {
      filters[field] = match;
    }
  });

  return filters;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesQueryValue(query, value) {
  const normalizedValue = String(value).trim().toLowerCase();
  if (!normalizedValue) {
    return false;
  }

  if (normalizedValue.length <= 2) {
    return false;
  }

  return query.includes(normalizedValue);
}

function detectIntent(query) {
  if (/\b(highest|largest|most|max|maximum|top)\b/.test(query)) {
    return 'highest';
  }

  if (/\b(lowest|smallest|least|min|minimum)\b/.test(query)) {
    return 'lowest';
  }

  if (/\b(count|how many|number of)\b/.test(query)) {
    return 'count';
  }

  if (/\b(list|show|display)\b/.test(query) && /\b(record|transaction|entry)\b/.test(query)) {
    return 'list';
  }

  if (/\b(breakdown|split|group|by|per|each)\b/.test(query)) {
    return 'breakdown';
  }

  return 'total';
}

function wantsExplanation(query) {
  return /\b(source|sources|related|details|detail|which|what|from where|explain|about)\b/.test(query);
}

function filterRows(rows, query) {
  const normalizedQuery = normalizeQuery(query);
  const month = findMonth(normalizedQuery);
  const type = findType(normalizedQuery);
  const specificFilters = findSpecificFilters(normalizedQuery, rows);

  const filteredRows = rows.filter(row => {
    if (month && Number(row.month) !== month) {
      return false;
    }

    if (type && String(row.type || '').toLowerCase() !== type.toLowerCase()) {
      return false;
    }

    return Object.entries(specificFilters).every(([field, value]) =>
      String(row[field] || '').trim().toLowerCase() === String(value).trim().toLowerCase()
    );
  });

  return {
    normalizedQuery,
    month,
    type,
    specificFilters,
    filteredRows
  };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function formatScopeLabel({ month, type, specificFilters }) {
  const parts = [];

  if (month) {
    parts.push(MONTH_NUMBER_TO_NAME[month]);
  }

  if (type) {
    parts.push(type);
  }

  Object.entries(specificFilters).forEach(([field, value]) => {
    parts.push(`${FIELD_LABELS[field] || field}: ${value}`);
  });

  return parts.length ? parts.join(' | ') : 'All records';
}

function toResponseLines(title, lines = []) {
  return [title, ...lines.filter(Boolean)].join('\n');
}

function groupRows(rows, field) {
  const groups = new Map();

  rows.forEach(row => {
    const rawValue = field === 'month' ? MONTH_NUMBER_TO_NAME[row.month] : row[field];
    const key = rawValue || 'Unspecified';
    const existing = groups.get(key) || { label: key, totalAmount: 0, count: 0 };
    existing.totalAmount += Number(row.amount) || 0;
    existing.count += 1;
    groups.set(key, existing);
  });

  return [...groups.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}

function describeScope({ month, type, specificFilters }) {
  const parts = [];

  if (month) {
    parts.push(`for ${MONTH_NUMBER_TO_NAME[month]}`);
  }

  if (type) {
    parts.push(`for ${type.toLowerCase()} records`);
  }

  Object.entries(specificFilters).forEach(([field, value]) => {
    parts.push(`where ${field} is ${value}`);
  });

  return parts.length ? ` ${parts.join(' ')}` : '';
}

function buildContextPhrase(row) {
  const parts = [];

  if (row.project) {
    parts.push(`for ${row.project}`);
  }

  if (row.category) {
    parts.push(`under ${row.category}`);
  }

  if (row.department) {
    parts.push(`in ${row.department}`);
  }

  return parts.length ? ` (${parts.join(', ')})` : '';
}

function buildListResponse(rows) {
  const preview = rows.slice(0, 5).map(row => {
    const labelParts = [
      row.date || 'No date',
      row.type || 'Record',
      row.category || row.department || row.project || 'General'
    ];

    return `- ${labelParts.join(' - ')}: ${formatCurrency(row.amount)}`;
  });

  if (rows.length > 5) {
    preview.push(`- Showing 5 of ${rows.length} records`);
  }

  return toResponseLines('Matching records', preview);
}

function buildBreakdownResponse(rows, field, scopeText) {
  const grouped = groupRows(rows, field);

  if (grouped.length === 0) {
    return `I could not find any matching records${scopeText}.`;
  }

  const detailsByField = new Map();
  rows.forEach(row => {
    const key = field === 'month' ? MONTH_NUMBER_TO_NAME[row.month] : (row[field] || 'Unspecified');
    if (!detailsByField.has(key)) {
      detailsByField.set(key, []);
    }
    detailsByField.get(key).push(row);
  });

  const formatted = grouped
    .slice(0, 4)
    .map(item => {
      const relatedRows = detailsByField.get(item.label) || [];
      const sample = relatedRows[0];
      const extra = field === 'client'
        ? buildContextPhrase(sample)
        : sample?.client && field !== 'project'
          ? ` (for ${sample.client})`
          : '';

      return `- ${item.label}${extra}: ${formatCurrency(item.totalAmount)}`;
    });

  const fieldLabel = FIELD_LABELS[field] || field;
  return toResponseLines(`Breakdown by ${fieldLabel}${scopeText}`, formatted);
}

function buildSourceListResponse(rows, scopeText) {
  const grouped = groupRows(rows, 'client');

  if (!grouped.length) {
    return `I could not find any matching income sources${scopeText}.`;
  }

  const sourceDetails = grouped.slice(0, 4).map(group => {
    const sample = rows.find(row => (row.client || 'Unspecified') === group.label);
    return `- ${group.label}${buildContextPhrase(sample)}: ${formatCurrency(group.totalAmount)}`;
  });

  return toResponseLines(`Income sources${scopeText}`, sourceDetails);
}

function buildHighestLowestResponse(rows, intent, field, scopeText) {
  if (field) {
    const grouped = groupRows(rows, field);
    const selected = intent === 'lowest'
      ? [...grouped].sort((a, b) => a.totalAmount - b.totalAmount)[0]
      : grouped[0];

    if (!selected) {
      return `I could not find any matching records${scopeText}.`;
    }

    return toResponseLines(
      `${intent === 'lowest' ? 'Lowest' : 'Highest'} ${FIELD_LABELS[field] || field}${scopeText}`,
      [`- ${selected.label}: ${formatCurrency(selected.totalAmount)}`]
    );
  }

  const sorted = [...rows].sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0));
  const selected = intent === 'highest' ? sorted[sorted.length - 1] : sorted[0];

  if (!selected) {
    return `I could not find any matching records${scopeText}.`;
  }

  return toResponseLines(
    `${intent === 'lowest' ? 'Lowest' : 'Highest'} matching record${scopeText}`,
    [`- ${selected.category || selected.department || selected.project || 'Uncategorized'}: ${formatCurrency(selected.amount)}`]
  );
}

function summarizeFinancialQuery(rows, query) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'No financial data is available yet. Please upload a CSV file first.';
  }

  if (!query || typeof query !== 'string' || !query.trim()) {
    return 'Please ask a question about your uploaded financial data.';
  }

  const { normalizedQuery, month, type, specificFilters, filteredRows } = filterRows(rows, query);
  const intent = detectIntent(normalizedQuery);
  const requestedField = findRequestedField(normalizedQuery, filteredRows.length ? filteredRows : rows);
  const explanationRequested = wantsExplanation(normalizedQuery);
  const scopeText = describeScope({ month, type, specificFilters });
  const scopeLabel = formatScopeLabel({ month, type, specificFilters });

  if (filteredRows.length === 0) {
    return `I could not find any matching records${scopeText}.`;
  }

  if (intent === 'count') {
    return toResponseLines('Record count', [
      `- Scope: ${scopeLabel}`,
      `- Total records: ${filteredRows.length}`
    ]);
  }

  if (intent === 'list') {
    return buildListResponse(filteredRows);
  }

  if (type === 'Income' && requestedField === 'client') {
    return buildSourceListResponse(filteredRows, scopeText);
  }

  if (intent === 'breakdown' || requestedField) {
    return buildBreakdownResponse(filteredRows, requestedField || 'category', scopeText);
  }

  if (intent === 'highest' || intent === 'lowest') {
    return buildHighestLowestResponse(filteredRows, intent, requestedField, scopeText);
  }

  const totalAmount = filteredRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const recordLabel = type ? type.toLowerCase() : 'matching';
  if (explanationRequested) {
    const sampleDetails = filteredRows
      .slice(0, 2)
      .map(row => `${row.client || row.category || row.project || 'Unspecified'}${buildContextPhrase(row)}`)
      .map(item => `- Related to ${item}`);

    return toResponseLines('Summary', [
      `- Scope: ${scopeLabel}`,
      `- Total ${recordLabel}: ${formatCurrency(totalAmount)}`,
      `- Records: ${filteredRows.length}`,
      ...sampleDetails
    ]);
  }

  return toResponseLines('Summary', [
    `- Scope: ${scopeLabel}`,
    `- Total ${recordLabel}: ${formatCurrency(totalAmount)}`,
    `- Records: ${filteredRows.length}`
  ]);
}

module.exports = {
  summarizeFinancialQuery
};
