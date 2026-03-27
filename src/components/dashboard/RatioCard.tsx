import React from 'react';
import { getScoreColor } from '../../calculations/scoring';
import { formatPercent, formatRatio, formatCurrency, formatNumber } from '../../utils/formatters';
import TrendArrow from '../shared/TrendArrow';

interface RatioCardProps {
  label: string;
  value: number | null;
  previousValue?: number | null;
  thresholdKey?: string;
  format: 'percent' | 'ratio' | 'currency' | 'number';
  suffix?: string;
}

const colorToBorder: Record<string, string> = {
  green: 'border-l-emerald-500',
  yellow: 'border-l-yellow-500',
  red: 'border-l-red-500',
  gray: 'border-l-gray-300',
};

const colorToBg: Record<string, string> = {
  green: 'bg-emerald-50',
  yellow: 'bg-yellow-50',
  red: 'bg-red-50',
  gray: 'bg-white',
};

function formatValue(
  value: number | null,
  format: 'percent' | 'ratio' | 'currency' | 'number',
  suffix?: string
): string {
  let formatted: string;
  switch (format) {
    case 'percent':
      formatted = formatPercent(value);
      break;
    case 'ratio':
      formatted = formatRatio(value);
      break;
    case 'currency':
      formatted = formatCurrency(value);
      break;
    case 'number':
      formatted = formatNumber(value);
      break;
  }
  if (suffix && value !== null) {
    formatted += ` ${suffix}`;
  }
  return formatted;
}

function calculateChange(
  current: number | null,
  previous: number | null | undefined
): number | null {
  if (
    current === null ||
    previous === null ||
    previous === undefined ||
    previous === 0
  ) {
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

const RatioCard: React.FC<RatioCardProps> = ({
  label,
  value,
  previousValue,
  thresholdKey,
  format,
  suffix,
}) => {
  const scoreColor = thresholdKey ? getScoreColor(value, thresholdKey) : 'gray';
  const borderClass = colorToBorder[scoreColor];
  const bgClass = colorToBg[scoreColor];
  const change = calculateChange(value, previousValue);

  return (
    <div
      className={`rounded-lg border border-gray-200 border-l-4 ${borderClass} ${bgClass} px-4 py-3`}
    >
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-xl font-bold text-gray-900">
          {formatValue(value, format, suffix)}
        </span>
        {previousValue !== undefined && (
          <TrendArrow value={change} />
        )}
      </div>
    </div>
  );
};

export default RatioCard;
