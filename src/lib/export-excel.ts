import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export type ExportColumn = { key: string; label: string };

function formatCellValue(row: Record<string, any>, key: string): string {
  const val = row[key];

  if (key === 'matriculeAnterieur') {
    return row.vehicule?.immatriculationAnterieur ?? '';
  }

  if (key === 'observation') {
    return row.lastObservation?.text ?? '';
  }

  if (val == null) return '';

  if (key === 'assure') {
    if (typeof val === 'string') return val;
    return `${val.nom || ''} ${val.prenom || ''}`.trim();
  }

  if (key === 'dateRequete' || key === 'dateSinistre' || key === 'createdAt') {
    try {
      const date = val.toDate ? val.toDate() : new Date(val);
      return format(date, 'dd/MM/yyyy');
    } catch {
      return String(val);
    }
  }

  return String(val);
}

export function exportToExcel(
  rows: Record<string, any>[],
  columns: ExportColumn[],
  fileName?: string
) {
  const headers = columns.map(c => c.label);
  const data = rows.map(row => columns.map(col => formatCellValue(row, col.key)));

  const aoa = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto column widths
  const colWidths = columns.map((col, i) => {
    let max = col.label.length;
    for (const row of data) {
      if (row[i] && row[i].length > max) max = row[i].length;
    }
    return { wch: Math.min(max + 2, 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dossiers');

  const defaultName = `dossiers_export_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
  XLSX.writeFile(wb, fileName || defaultName);
}
