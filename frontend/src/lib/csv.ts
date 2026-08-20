export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(String(c.value(row) ?? ''))).join(','));
  return [header, ...lines].join('\r\n');
}
