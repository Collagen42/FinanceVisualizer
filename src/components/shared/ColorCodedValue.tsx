import React from 'react';
import { getScoreColor } from '../../calculations/scoring';
import { RATIO_THRESHOLDS } from '../../types/financial';
import { formatPercent, formatRatio, formatCurrency } from '../../utils/formatters';

interface ColorCodedValueProps {
  value: number | null;
  thresholdKey: string;
  format?: 'percent' | 'ratio' | 'currency';
  label: string;
}

const colorToBg: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-500',
};

const ColorCodedValue: React.FC<ColorCodedValueProps> = ({
  value,
  thresholdKey,
  format = 'ratio',
  label,
}) => {
  const color = getScoreColor(value, thresholdKey);
  const bgClass = colorToBg[color] ?? colorToBg.gray;

  let formatted: string;
  switch (format) {
    case 'percent':
      formatted = formatPercent(value);
      break;
    case 'currency':
      formatted = formatCurrency(value);
      break;
    case 'ratio':
    default:
      formatted = formatRatio(value);
      break;
  }

  return (
    <div className={`rounded-lg px-3 py-2 ${bgClass}`}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-lg font-semibold">{formatted}</div>
    </div>
  );
};

export default ColorCodedValue;
