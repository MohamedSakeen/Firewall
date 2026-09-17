/**
 * ValaiAran Security Console — Data Export Utilities
 * Adheres to Sections 14, 15, 16, 17 of the ValaiAran Design System Checklist.
 */

/**
 * Escapes a cell value for valid CSV output per RFC 4180
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports data to a valid RFC 4180 CSV file and triggers browser download
 * @param {string} filename - Target filename (without extension)
 * @param {Array<Object>} records - Array of data objects
 * @param {Array<{ key: string, label: string }>} [columns] - Optional specific columns
 */
export function exportToCsv(filename, records, columns = null) {
  if (!records || records.length === 0) {
    alert('No records to export');
    return;
  }

  // Determine headers
  let keys = [];
  let headers = [];

  if (columns && columns.length > 0) {
    keys = columns.map(c => c.key);
    headers = columns.map(c => c.label || c.key);
  } else {
    // Deduce from first record
    keys = Object.keys(records[0]);
    headers = keys;
  }

  const headerRow = headers.map(escapeCsvValue).join(',');
  const rows = records.map(record => {
    return keys.map(k => escapeCsvValue(record[k])).join(',');
  });

  const csvContent = [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Exports data as a machine-readable JSON array of records and triggers download
 * @param {string} filename - Target filename (without extension)
 * @param {Array<Object>|Object} data - Machine-readable record array or object
 */
export function exportToJson(filename, data) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    alert('No data to export');
    return;
  }

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${filename}.json`);
}

function downloadBlob(blob, fullFilename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fullFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
