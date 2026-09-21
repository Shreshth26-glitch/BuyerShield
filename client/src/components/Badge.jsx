import React from 'react';

/**
 * Badge - Civic Legal Research status indicator
 * @param {'primary' | 'warning' | 'neutral'} variant
 * @param {'rectangular' | 'pill'} shape
 */
export const Badge = ({
  variant = 'primary',
  shape = 'rectangular',
  className = '',
  children,
}) => {
  let styleClasses = '';
  if (variant === 'primary') {
    styleClasses = 'bg-accent-primary-bg text-accent-primary border border-accent-primary/20';
  } else if (variant === 'warning') {
    styleClasses = 'bg-accent-warning-bg text-accent-warning border border-accent-warning/20';
  } else {
    styleClasses = 'bg-[#ECE5D8] text-text-secondary border border-border';
  }

  const shapeClass = shape === 'pill' ? 'rounded-full' : 'rounded-none';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-medium tracking-wide uppercase ${shapeClass} ${styleClasses} ${className}`}
    >
      {children}
    </span>
  );
};
