export type CsvValue = string | number | null | undefined;

export function createCsv(rows: CsvValue[][]) {
  const escapeCell = (value: CsvValue) => {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`;
}

export function downloadCsv(filename: string, rows: CsvValue[][]) {
  const blob = new Blob([createCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
