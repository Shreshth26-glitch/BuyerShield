import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../components/Section';
import { EyebrowLabel } from '../components/EyebrowLabel';
import { NumberedColumn } from '../components/NumberedColumn';
import { Badge } from '../components/Badge';
import { StatBlock } from '../components/StatBlock';
import { ArrowRight, CheckSquare, Scale, BookOpen, ShieldCheck } from 'lucide-react';
import { gsap, prefersReducedMotion, isMobileViewport } from '../utils/motion';

// Lazy-loaded Three.js hero background (code-split from initial bundle)
const HeroBackground3D = React.lazy(() => import('../components/HeroBackground3D'));

export const LandingPage = () => {
  // Refs for coordinated hero page-load timeline
  const heroSectionRef = useRef(null);
  const heroEyebrowDashRef = useRef(null);
  const heroEyebrowTextRef = useRef(null);
  const heroHeadlineLine1Ref = useRef(null);
  const heroHeadlineLine2Ref = useRef(null);
  const heroParagraphRef = useRef(null);
  const heroCtasRef = useRef(null);
  const heroStatsRef = useRef(null);

  // Refs for scroll-triggered workflow reveals & scrubbed dash
  const workflowSectionRef = useRef(null);
  const workflowEyebrowDashRef = useRef(null);
  const workflowColumnsRef = useRef(null);

  // 3D Hero enablement state (desktop only, reduced-motion disabled, hero in view)
  const [canShow3D, setCanShow3D] = useState(
    () => !prefersReducedMotion() && !isMobileViewport()
  );
  const [heroInView, setHeroInView] = useState(true);

  // Monitor viewport resize for 3D enablement
  useEffect(() => {
    const checkViewport = () => {
      setCanShow3D(!prefersReducedMotion() && !isMobileViewport());
    };
    window.addEventListener('resize', checkViewport, { passive: true });
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Monitor hero intersection for 3D mounting/unmounting
  useEffect(() => {
    const heroEl = heroSectionRef.current;
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  // 1. Single Coordinated Page-Load Timeline (Runs once on initial mount only)
  useLayoutEffect(() => {
    const reducedMotion = prefersReducedMotion();

    if (reducedMotion) {
      // Jump immediately to end state
      gsap.set('#site-navbar', { opacity: 1 });
      if (heroEyebrowDashRef.current) gsap.set(heroEyebrowDashRef.current, { width: 22 });
      if (heroEyebrowTextRef.current) gsap.set(heroEyebrowTextRef.current, { opacity: 1 });
      if (heroHeadlineLine1Ref.current) gsap.set(heroHeadlineLine1Ref.current, { opacity: 1, y: 0 });
      if (heroHeadlineLine2Ref.current) gsap.set(heroHeadlineLine2Ref.current, { opacity: 1, y: 0 });
      if (heroParagraphRef.current) gsap.set(heroParagraphRef.current, { opacity: 1, y: 0 });
      if (heroCtasRef.current) gsap.set(heroCtasRef.current, { opacity: 1, y: 0 });
      if (heroStatsRef.current) gsap.set(heroStatsRef.current, { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
      });

      // 1. nav fade-in (300ms)
      tl.fromTo(
        '#site-navbar',
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power1.out' }
      )
      // 2. eyebrow dash draws 0->22px (300ms, power2.out)
      .fromTo(
        heroEyebrowDashRef.current,
        { width: 0 },
        { width: 22, duration: 0.3, ease: 'power2.out' },
        '+=0.05'
      )
      // 3. eyebrow label text fades in
      .fromTo(
        heroEyebrowTextRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power1.out' },
        '-=0.1'
      )
      // 4. headline splits into lines, each line fades up (opacity 0->1, y 12px->0), staggered 80-100ms per line
      .fromTo(
        [heroHeadlineLine1Ref.current, heroHeadlineLine2Ref.current],
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.09,
          ease: 'power2.out',
        },
        '-=0.05'
      )
      // 5. supporting paragraph fades in
      .fromTo(
        heroParagraphRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power1.out' },
        '-=0.15'
      )
      // CTAs and stat indicators settle in gracefully
      .fromTo(
        heroCtasRef.current,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power1.out' },
        '-=0.1'
      )
      .fromTo(
        heroStatsRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power1.out' },
        '-=0.1'
      );
    });

    return () => ctx.revert();
  }, []);

  // 2. Scroll-Triggered Reveals & Eyebrow Dash Scrub
  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      if (workflowEyebrowDashRef.current) {
        gsap.set(workflowEyebrowDashRef.current, { width: 22 });
      }
      if (workflowColumnsRef.current) {
        gsap.set(workflowColumnsRef.current.children, { opacity: 1, y: 0 });
      }
      return;
    }

    const ctx = gsap.context(() => {
      // 2a. Numbered columns reveal: fades up + shifts slightly on scroll into view, staggered ~100ms, "once" trigger
      if (workflowColumnsRef.current) {
        gsap.fromTo(
          workflowColumnsRef.current.children,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: workflowColumnsRef.current,
              start: 'top 85%',
              once: true,
            },
          }
        );
      }

      // 2b. Workflow eyebrow dash draws in sync with scroll progress through that section (scrub: true)
      if (workflowEyebrowDashRef.current && workflowSectionRef.current) {
        gsap.fromTo(
          workflowEyebrowDashRef.current,
          { width: 0 },
          {
            width: 22,
            ease: 'none',
            scrollTrigger: {
              trigger: workflowSectionRef.current,
              start: 'top 85%',
              end: 'top 35%',
              scrub: true,
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION with Grid Texture & Sharp Aesthetics */}
      <div ref={heroSectionRef} className="relative w-full overflow-hidden">
        <Section
          textured={true}
          borderBottom={true}
          className="pt-20 pb-24 md:pt-28 md:pb-32 relative"
        >
          {/* Three.js Hero Wireframe Plane (Lazy-loaded, scoped only to hero, desktop only) */}
          {canShow3D && heroInView && (
            <Suspense fallback={null}>
              <HeroBackground3D />
            </Suspense>
          )}

          <div className="max-w-4xl relative z-10">
            {/* Eyebrow label */}
            <EyebrowLabel
              variant="primary"
              text="RERA SECTION 18 ADVISORY • ALL-INDIA JURISDICTION"
              dashRef={heroEyebrowDashRef}
              textRef={heroEyebrowTextRef}
              className="mb-6"
            />

            {/* Large Serif Headline - Split into lines, each line fades up */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-[1.12] mb-6">
              <span
                ref={heroHeadlineLine1Ref}
                className="block"
              >
                Delayed possession is a breach of contract.
              </span>
              <span
                ref={heroHeadlineLine2Ref}
                className="block mt-1 sm:mt-2"
              >
                Know your statutory remedies.
              </span>
            </h1>

            {/* Supporting Sans Paragraph */}
            <p
              ref={heroParagraphRef}
              className="text-lg sm:text-xl text-text-secondary leading-relaxed mb-10 max-w-3xl"
            >
              Under Section 18 of the Real Estate (Regulation & Development) Act 2016, allottees are entitled to unconditional monthly interest for delayed possession or a 100% refund with interest. BuyerShield provides verified statutory intelligence for Indian apartment buyers.
            </p>

            {/* Action CTAs & Trust Badges */}
            <div
              ref={heroCtasRef}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-14"
            >
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-base font-medium rounded-none border border-accent-primary transition-colors text-center"
              >
                <span>Verify Your Project Delay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-card hover:bg-page text-text-primary text-base font-medium rounded-none border border-border transition-colors text-center"
              >
                <span>Access Existing Case</span>
              </Link>
            </div>

            {/* Key Statutory Indicators (Hairline border layout) */}
            <div
              ref={heroStatsRef}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-border"
            >
              <StatBlock
                label="Statutory Benchmark"
                value="SBI MCLR + 2%"
                sublabel="Rule-mandated interest rate"
                variant="primary"
              />
              <StatBlock
                label="Remedy Choice"
                value="Full Refund / Delay Pay"
                sublabel="Sole prerogative of buyer"
              />
              <StatBlock
                label="Enforceable Act"
                value="RERA 2016"
                sublabel="Section 18(1) & (2)"
              />
              <StatBlock
                label="Average Delay Tracked"
                value="18.4 Mo"
                sublabel="Across major metros"
                variant="warning"
              />
            </div>
          </div>
        </Section>
      </div>

      {/* THREE-COLUMN NUMBERED WORKFLOW SECTION */}
      {/* Full-width, divided by hairline borders, no rounded cards */}
      <section
        id="workflow"
        ref={workflowSectionRef}
        className="w-full bg-page border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-border gap-4">
            <div>
              <EyebrowLabel
                variant="warning"
                text="STANDARD OPERATING PROCEDURE"
                dashRef={workflowEyebrowDashRef}
                className="mb-3"
              />
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary">
                How Statutory Delay Compensation Works
              </h2>
            </div>
            <p className="text-sm text-text-secondary max-w-md">
              A systematic evidentiary procedure from RERA filing audit to formal conciliation or Tribunal order execution.
            </p>
          </div>

          {/* Multi-column layout separated by vertical hairline dividers */}
          <div
            ref={workflowColumnsRef}
            className="grid grid-cols-1 md:grid-cols-3 border border-border bg-border divide-y md:divide-y-0 md:divide-x divide-border"
          >
            <NumberedColumn
              number="01"
              eyebrow="CROSS-REFERENCE FILING"
              title="Audit Promoter Filings Against Agreement"
              description="Developers frequently revise completion dates on RERA web portals without buyer consent. We verify your registered Agreement for Sale date against official state portal quarterly progress disclosures."
              variant="primary"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                <CheckSquare className="w-4 h-4 text-accent-primary" />
                <span>Validates Grace Periods & Force Majeure</span>
              </div>
            </NumberedColumn>

            <NumberedColumn
              number="02"
              eyebrow="QUANTIFY LIABILITY"
              title="Compute Accrued Interest Under Sec 18"
              description="Calculate exact statutory liability accrued month-by-month at the mandated State RERA benchmark (SBI Highest Marginal Cost of Funds Lending Rate + 200 basis points) on every rupee paid."
              variant="warning"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                <Scale className="w-4 h-4 text-accent-warning" />
                <span>Pre-formatted payment schedule audit</span>
              </div>
            </NumberedColumn>

            <NumberedColumn
              number="03"
              eyebrow="ELECT REMEDY"
              title="Prepare Notice of Default or Tribunal Complaint"
              description="Decide whether to remain in the project claiming monthly interest until Occupancy Certificate (OC) or seek 100% refund with interest and legal compensation under Form M/N."
              variant="primary"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                <BookOpen className="w-4 h-4 text-accent-primary" />
                <span>Form M Complaint Draft Skeleton</span>
              </div>
            </NumberedColumn>
          </div>
        </div>
      </section>

      {/* STATUTORY HIGHLIGHTS: Two Column Civic Research Grid */}
      <section id="provisions" className="w-full bg-page border-b border-border py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-6">
              <EyebrowLabel variant="primary" text="LEGAL FOUNDATION" />
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
                Section 18 of the Real Estate Act, 2016
              </h2>
              <p className="text-text-secondary text-base leading-relaxed">
                The Supreme Court of India in <em className="text-text-primary font-serif">M/s Newtech Promoters and Developers Pvt. Ltd. v. State of UP (2021)</em> reaffirmed that the buyer's right to seek refund or interest for delay is absolute and unconditional.
              </p>

              <div className="p-5 bg-card border border-border">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong className="block text-text-primary font-medium mb-1">
                      No Unilateral Extensions
                    </strong>
                    <span className="text-text-secondary">
                      Extensions granted by RERA authorities to developers do not take away the individual buyer's right to claim compensation from the agreed date.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 border border-border bg-card p-8 sm:p-10 space-y-8">
              <div className="border-b border-border pb-6">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h3 className="font-serif text-xl font-bold text-text-primary">
                    Option A: Continuation with Delayed Interest
                  </h3>
                  <Badge variant="primary">Section 18(1) Proviso</Badge>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed">
                  If the buyer does not intend to withdraw from the project, the promoter shall pay interest for every month of delay until the handing over of possession with a valid Occupancy Certificate.
                </p>
              </div>

              <div className="border-b border-border pb-6">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h3 className="font-serif text-xl font-bold text-text-primary">
                    Option B: Unconditional Withdrawal & Full Refund
                  </h3>
                  <Badge variant="warning">Section 18(1)</Badge>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed">
                  If the buyer wishes to withdraw, the promoter is liable to return the full amount received along with statutory interest and compensation within 60 days of the order.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h3 className="font-serif text-xl font-bold text-text-primary">
                    Option C: Defective Title & Structural Defects
                  </h3>
                  <Badge variant="neutral">Section 14 & 18(2)</Badge>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Compensatory claims for defective title of the land or structural flaws noticed within five years from possession date, with no limitation period barring title claims.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CIVIC CALL TO ACTION */}
      <section className="w-full bg-grid-pattern py-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <EyebrowLabel variant="warning" text="SECURE YOUR ENTITLEMENT" className="mb-4" />
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-text-primary mb-6">
            Audit your possession delay before your builder requests an amendment.
          </h2>
          <p className="text-base sm:text-lg text-text-secondary mb-8 max-w-2xl mx-auto">
            Create an empty case file today. As Phase 2 rolls out, track real-time regulatory scraping, calculate exact interest sums, and assemble your RERA dossier.
          </p>

          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-base font-semibold rounded-none border border-accent-primary transition-colors"
          >
            <span>Create Free Case File</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
