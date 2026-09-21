import React from 'react';
import { EyebrowLabel } from './EyebrowLabel';

/**
 * NumberedColumn - Sequential multi-column step card with hairline border
 * @param {string} number - e.g. "01", "02", "03"
 * @param {string} eyebrow - e.g. "PHASE I: IDENTIFY"
 * @param {string} title - Serif headline
 * @param {string | React.ReactNode} description - Sans body prose
 * @param {'primary' | 'warning'} [variant]
 * @param {boolean} [isLast]
 */
export const NumberedColumn = ({
  number,
  eyebrow,
  title,
  description,
  variant = 'primary',
  children,
  className = '',
  style,
}) => {
  return (
    <div
      style={style}
      className={`relative p-6 sm:p-8 bg-card flex flex-col justify-between transition-colors ${className}`}
    >
      <div>
        {/* Header: Number and Eyebrow */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-border/80 mb-6">
          <EyebrowLabel variant={variant} text={eyebrow} />
          <span className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-text-secondary/50 select-none">
            {number}
          </span>
        </div>

        {/* Title in Editorial Serif */}
        <h3 className="font-serif text-xl sm:text-2xl font-semibold text-text-primary mb-3 leading-snug">
          {title}
        </h3>

        {/* Description in Clean Sans */}
        <div className="text-text-secondary text-sm sm:text-base leading-relaxed">
          {description}
        </div>
      </div>

      {children && <div className="mt-6 pt-4 border-t border-border/40">{children}</div>}
    </div>
  );
};
