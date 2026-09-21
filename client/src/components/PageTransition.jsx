import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap, prefersReducedMotion } from '../utils/motion';

/**
 * PageTransition - Wraps routed views in a 280ms fade + slight vertical shift
 * using GSAP power2.out easing, or instant if prefers-reduced-motion is enabled.
 */
export const PageTransition = ({ children }) => {
  const containerRef = useRef(null);
  const location = useLocation();

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: 'power2.out',
          clearProps: 'transform',
        }
      );
    }, el);

    return () => ctx.revert();
  }, [location.pathname]);

  return (
    <div ref={containerRef} className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
};
