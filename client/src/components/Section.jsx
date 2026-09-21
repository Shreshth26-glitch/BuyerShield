import React from 'react';

/**
 * Section - Structural layout section with optional grid texture and hairline dividers
 * @param {boolean} textured - If true, applies subtle 40px grid pattern
 * @param {boolean} borderTop - If true, adds 1px hairline border at top
 * @param {boolean} borderBottom - If true, adds 1px hairline border at bottom
 * @param {boolean} container - Wrap content in max-w-7xl container
 */
export const Section = ({
  textured = false,
  borderTop = false,
  borderBottom = false,
  container = true,
  className = '',
  children,
  id,
}) => {
  const bgClass = textured ? 'bg-grid-pattern' : 'bg-page';
  const borderTopClass = borderTop ? 'border-t border-border' : '';
  const borderBottomClass = borderBottom ? 'border-b border-border' : '';

  return (
    <section
      id={id}
      className={`relative w-full py-16 sm:py-24 ${bgClass} ${borderTopClass} ${borderBottomClass} ${className}`}
    >
      {container ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
};
