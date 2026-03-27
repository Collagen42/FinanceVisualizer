export function formatCurrency(value: number | null, currency = 'T RON'): string {
  if (value === null) return '—';
  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} ${currency}`;
}

export function formatCompactCurrency(value: number | null, currency = 'T RON'): string {
  if (value === null) return '—';
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M ${currency}`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K ${currency}`;
  }
  return `${value.toFixed(0)} ${currency}`;
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatRatio(value: number | null, decimals = 2): string {
  if (value === null) return '—';
  return value.toFixed(decimals);
}

export function formatNumber(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('de-DE').format(value);
}

export function getChangeColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-500';
  return 'text-gray-500';
}

export function getRatioColor(
  value: number | null,
  thresholds: { good: number; moderate: number; direction: 'higher-better' | 'lower-better' }
): string {
  if (value === null) return 'bg-gray-100 text-gray-500';
  const { good, moderate, direction } = thresholds;
  if (direction === 'higher-better') {
    if (value >= good) return 'bg-emerald-100 text-emerald-800';
    if (value >= moderate) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  } else {
    if (value <= good) return 'bg-emerald-100 text-emerald-800';
    if (value <= moderate) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }
}
