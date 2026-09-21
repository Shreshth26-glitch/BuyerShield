import React from 'react';

/**
 * EyebrowLabel - Civic Legal Research small-caps label with accent dash
 * @param {'primary' | 'warning'} [variant='primary']
 * @param {string} [text]
 * @param {boolean} [cssAnimated=false] - Whether to apply CSS keyframe animations
 * @param {React.Ref} [dashRef] - Ref to attach to the dash element (for GSAP/scrub)
 * @param {React.Ref} [textRef] - Ref to attach to the text element
 * @param {React.CSSProperties} [dashStyle]
 * @param {React.CSSProperties} [textStyle]
 */
export const EyebrowLabel = ({
  variant = 'primary',
  text,
  children,
  className = '',
  cssAnimated = false,
  dashRef,
  textRef,
  dashStyle,
  textStyle,
}) => {
  const isWarning = variant === 'warning';

  const dashColor = isWarning ? 'bg-accent-warning' : 'bg-accent-primary';
  const textColor = isWarning ? 'text-accent-warning' : 'text-accent-primary';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        ref={dashRef}
        style={dashStyle}
        className={`inline-block h-[2px] origin-left ${dashColor} ${
          cssAnimated ? 'w-[22px] animate-dash' : 'w-[22px]'
        }`}
        aria-hidden="true"
      />
      <span
        ref={textRef}
        style={textStyle}
        className={`font-mono text-xs tracking-eyebrow uppercase font-bold ${textColor} ${
          cssAnimated ? 'animate-fade-in' : ''
        }`}
      >
        {text || children}
      </span>
    </div>
  );
};

