import React from 'react';

/**
 * StatBlock - Label + Monospace value for legal dates, figures, and RERA IDs
 * @param {string} label
 * @param {string | React.ReactNode} value
 * @param {string} [sublabel]
 * @param {'default' | 'warning' | 'primary'} [variant]
 */
export const StatBlock = ({
  label,
  value,
  sublabel,
  variant = 'default',
  className = '',
}) => {
  let valueColor = 'text-text-primary';
  if (variant === 'primary') valueColor = 'text-accent-primary';
  if (variant === 'warning') valueColor = 'text-accent-warning';

  return (
    <div className={`flex flex-col ${className}`}>
      <span className="font-mono text-xs uppercase tracking-eyebrow text-text-secondary font-medium mb-1">
        {label}
      </span>
      <span className={`font-mono text-base md:text-lg font-semibold tracking-tight ${valueColor}`}>
        {value}
      </span>
      {sublabel && (
        <span className="text-xs text-text-secondary mt-0.5">
          {sublabel}
        </span>
      )}
    </div>
  );
};
