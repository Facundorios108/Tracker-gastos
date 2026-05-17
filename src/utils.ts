export function formatCurrency(amount: number, currency: string = 'ARS'): string {
  if (currency === 'ARS') {
    return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `US$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function groupTransactionsByDate(transactions: { date: string }[]): Map<string, typeof transactions> {
  const groups = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const key = new Date(t.date).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return groups;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function getMonthName(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  return date.toLocaleDateString('es-AR', { month: 'long' });
}

export function getUniqueMonths(transactions: { date: string }[]): { label: string; value: string }[] {
  const months = new Set<string>();
  transactions.forEach(t => {
    const d = new Date(t.date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    months.add(`${year}-${month.toString().padStart(2, '0')}`);
  });

  return Array.from(months)
    .sort((a, b) => b.localeCompare(a)) // Latest first
    .map(m => {
      const [year, month] = m.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1);
      return {
        label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
        value: m,
      };
    });
}

export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  return { start: formatDate(start), end: formatDate(end) };
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  const t = new Date(date).getTime();
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T23:59:59.999`).getTime();
  return t >= s && t <= e;
}
