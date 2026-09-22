import React from 'react';
import { Scale } from 'lucide-react';

/**
 * Permanent, non-dismissible civic disclaimer band for Section 18 statutory calculations.
 */
export const RemedyDisclaimer = ({ state = 'your state', benchmark = 'SBI Highest MCLR', spread = '2.00%', className = '' }) => {
  return (
    <div
      className={`border border-border/80 bg-card p-4 sm:p-4.5 flex items-start gap-3 text-text-secondary ${className}`}
      role="note"
      aria-label="Statutory Calculation Disclaimer"
    >
      <Scale className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
      <div className="space-y-1 text-xs leading-relaxed font-sans">
        <div className="font-mono text-[10px] uppercase tracking-eyebrow text-text-primary font-bold flex items-center gap-1.5">
          <span>STATUTORY COMPUTATION NOTICE</span>
          <span className="text-text-secondary">•</span>
          <span className="text-text-secondary font-normal">NON-DISMISSABLE BENCHMARK</span>
        </div>
        <p className="text-text-secondary">
          This is a deterministic mathematical calculation based on the interest rate policy on record for{' '}
          <strong className="text-text-primary">{state}</strong> ({benchmark} + {spread}),{' '}
          <strong className="text-text-primary">not legal advice</strong>. Confirm your case's factual payment disbursements and registered agreement dates before relying on this figure before an Adjudicating Officer or Tribunal.
        </p>
      </div>
    </div>
  );
};
