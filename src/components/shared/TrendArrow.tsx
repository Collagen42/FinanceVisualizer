import React from 'react';

interface TrendArrowProps {
  value: number | null;
}

const TrendArrow: React.FC<TrendArrowProps> = ({ value }) => {
  if (value === null) {
    return <span className="text-gray-400 text-sm">&mdash;</span>;
  }

  if (value === 0) {
    return <span className="text-gray-500 text-sm">&rarr; 0%</span>;
  }

  const isPositive = value > 0;
  const arrow = isPositive ? '\u2191' : '\u2193';
  const colorClass = isPositive ? 'text-emerald-600' : 'text-red-500';
  const formatted = Math.abs(value).toFixed(1);

  return (
    <span className={`${colorClass} text-sm font-medium inline-flex items-center gap-0.5`}>
      <span>{arrow}</span>
      <span>{formatted}%</span>
    </span>
  );
};

export default TrendArrow;
