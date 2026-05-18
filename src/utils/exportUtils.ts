import type { Transaction } from '../types';
import { getCategoryConfig } from '../types';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
};

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  filename: string = 'mis-movimientos'
): void {
  const headers = [
    'Fecha',
    'Tipo',
    'Descripción',
    'Categoría',
    'Monto',
    'Moneda',
    'Método de Pago',
    'Notas',
  ];

  const rows = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((t) => {
      const cat = getCategoryConfig(t.category);
      const date = new Date(t.date).toLocaleDateString('es-AR');
      const type = t.type === 'income' ? 'Ingreso' : 'Gasto';
      const method = t.paymentMethod ? PAYMENT_METHOD_LABELS[t.paymentMethod] || '' : '';

      return [
        date,
        type,
        escapeCSV(t.description),
        escapeCSV(cat.label),
        t.type === 'expense' ? `-${t.amount}` : `${t.amount}`,
        t.currency,
        method,
        escapeCSV(t.notes || ''),
      ].join(',');
    });

  // BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
