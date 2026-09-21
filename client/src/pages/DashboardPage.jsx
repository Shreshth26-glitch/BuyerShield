import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyebrowLabel } from '../components/EyebrowLabel';
import { Badge } from '../components/Badge';
import { StatBlock } from '../components/StatBlock';
import { NumberedColumn } from '../components/NumberedColumn';
import { FolderOpen, Plus, AlertTriangle, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { gsap, prefersReducedMotion } from '../utils/motion';
import { AddCaseModal } from '../components/AddCaseModal';

const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const DashboardPage = () => {
  const { user, authFetch } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const stepCardsRef = useRef(null);
  const caseListRef = useRef(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/cases');
      if (res.ok) {
        const json = await res.json();
        setCases(json.data || []);
      } else {
        setError('Could not fetch active cases from registry.');
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError('Network error connecting to backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [authFetch]);

  // Motion reveal for empty state step cards (Phase 1B ScrollTrigger)
  useLayoutEffect(() => {
    if (loading || prefersReducedMotion() || !stepCardsRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        stepCardsRef.current.children,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: stepCardsRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, [loading, cases.length]);

  // Motion reveal for active case list rows (Phase 1B staggered fade-up)
  useLayoutEffect(() => {
    if (loading || prefersReducedMotion() || !caseListRef.current || cases.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        caseListRef.current.children,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.08,
          ease: 'power2.out',
        }
      );
    });

    return () => ctx.revert();
  }, [loading, cases.length]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] bg-page">
      
      {/* Top Dossier Header Bar */}
      <div className="w-full bg-card border-b border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <EyebrowLabel variant="primary" text="ALLOTTEE DOSSIER" />
                <Badge variant="primary" shape="rectangular">PHASE 2 CASE WORKSPACE</Badge>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary">
                Case Management Workspace
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Authenticated Allottee: <span className="font-semibold text-text-primary">{user?.name}</span> ({user?.email})
              </p>
            </div>

            {/* Quick action button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] border border-accent-primary font-mono text-xs uppercase tracking-wider transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Case File</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Hairline Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 mt-6 border-t border-border">
            <StatBlock
              label="Active RERA Cases"
              value={loading ? "..." : cases.length.toString().padStart(2, '0')}
              sublabel="Under active tracking"
              variant="primary"
            />
            <StatBlock
              label="Total Capital Tracked"
              value={
                loading
                  ? "..."
                  : formatINR(cases.reduce((sum, c) => sum + (c.total_paid || 0), 0))
              }
              sublabel="Across active case dossiers"
            />
            <StatBlock
              label="Account Authority"
              value={user?.role?.toUpperCase() || "BUYER"}
              sublabel="Section 18 Allottee Rights"
            />
            <StatBlock
              label="Backend Synced"
              value="PostgreSQL 18"
              sublabel="JWT Session Validated"
              variant="primary"
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        
        {loading ? (
          <div className="p-12 text-center border border-border bg-card">
            <span className="font-mono text-sm text-text-secondary">
              Synchronizing case records with secure registry...
            </span>
          </div>
        ) : error ? (
          <div className="p-6 border border-accent-warning/30 bg-accent-warning-bg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-warning shrink-0 mt-0.5" />
            <div className="text-sm text-accent-warning">
              {error}
            </div>
          </div>
        ) : cases.length === 0 ? (
          /* =================================================================== */
          /* EMPTY STATE: Retained exactly from Phase 1                          */
          /* =================================================================== */
          <div className="border border-border bg-card p-8 sm:p-12">
            
            {/* Empty State Banner */}
            <div className="max-w-2xl mx-auto text-center py-6">
              <div className="w-14 h-14 bg-page border border-border flex items-center justify-center mx-auto mb-5">
                <FolderOpen className="w-7 h-7 text-text-secondary" strokeWidth={1.5} />
              </div>
              
              <EyebrowLabel variant="warning" text="REGISTRY STATUS: EMPTY" className="mb-3" />
              
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary mb-3">
                No Active RERA Cases On File
              </h2>
              
              <p className="text-text-secondary text-sm sm:text-base leading-relaxed mb-8">
                Your case workspace is ready. Link your state RERA registration number or enter your project details to track delays, audit promoter disclosures, and log payment receipts.
              </p>

              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-sm font-medium border border-accent-primary transition-colors mb-8"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Project Case</span>
              </button>

              {/* Sample Identifiers / Format Indicator in Mono */}
              <div className="p-4 bg-page border border-border text-left mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-text-secondary uppercase tracking-eyebrow">
                    Supported RERA Identifier Formats
                  </span>
                  <Badge variant="neutral">Phase 2 Enabled</Badge>
                </div>
                <div className="space-y-1.5 font-mono text-xs text-text-primary">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">MahaRERA:</span>
                    <span className="bg-card px-2 py-0.5 border border-border">P51800001234</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Karnataka RERA:</span>
                    <span className="bg-card px-2 py-0.5 border border-border">PRM/KA/RERA/1251/310/PR/171015/000451</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">UP RERA:</span>
                    <span className="bg-card px-2 py-0.5 border border-border">UPRERAPRJ4521</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preparation Roadmap using NumberedColumn pattern */}
            <div className="pt-8 border-t border-border">
              <div className="mb-6">
                <EyebrowLabel variant="primary" text="HOW IT WORKS • PHASE 2" className="mb-1" />
                <h3 className="font-serif text-xl font-bold text-text-primary">
                  What Happens Once You Add Your Project
                </h3>
              </div>

              <div
                ref={stepCardsRef}
                className="grid grid-cols-1 md:grid-cols-3 border border-border bg-border divide-y md:divide-y-0 md:divide-x divide-border"
              >
                <NumberedColumn
                  number="01"
                  eyebrow="RERA IDENTIFICATION"
                  title="Official Progress Audit"
                  description="Search pre-indexed records or enter your project details manually to establish the statutory baseline."
                  variant="primary"
                />
                <NumberedColumn
                  number="02"
                  eyebrow="FINANCIAL RECONCILIATION"
                  title="Sec 18 Interest Ledger"
                  description="Detailed statement of delay compensation calculated at SBI MCLR + 2% per annum, compounded on every rupee paid."
                  variant="warning"
                />
                <NumberedColumn
                  number="03"
                  eyebrow="TRIBUNAL FILING"
                  title="Form M Legal Draft"
                  description="Pre-formatted formal complaint ready for filing before the Real Estate Regulatory Authority under Section 31."
                  variant="primary"
                />
              </div>
            </div>

          </div>
        ) : (
          /* =================================================================== */
          /* ACTIVE CASES LIST: Hairline-divided row style                      */
          /* =================================================================== */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <EyebrowLabel variant="primary" text="DOCUMENTED CASES" className="mb-1" />
                <h2 className="font-serif text-2xl font-bold text-text-primary">
                  Active Property Cases ({cases.length})
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-page border border-border text-xs font-mono text-text-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Case</span>
              </button>
            </div>

            <div
              ref={caseListRef}
              className="border border-border bg-card divide-y divide-border"
            >
              {cases.map((c) => {
                const isDelayed = (c.days_delayed || 0) > 0;
                return (
                  <div
                    key={c.id}
                    className="p-6 hover:bg-page/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-xl font-bold text-text-primary">
                          {c.project_name}
                        </span>
                        <Badge variant="primary">{c.state}</Badge>
                        <span className="font-mono text-xs bg-page px-2 py-0.5 border border-border text-text-secondary">
                          {c.rera_number}
                        </span>
                      </div>

                      <div className="text-xs text-text-secondary font-mono">
                        Developer: <strong className="text-text-primary font-normal">{c.developer_name}</strong>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 pt-1 text-xs font-mono">
                        <div>
                          <span className="text-text-secondary block">Promised Possession:</span>
                          <span className="text-text-primary font-semibold">
                            {formatDate(c.promised_date_from_agreement)}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary block">Total Capital Logged:</span>
                          <span className="text-text-primary font-semibold">
                            {formatINR(c.total_paid)}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary block">Remedy Intent:</span>
                          <span className="text-text-primary">
                            {c.chosen_remedy === 'DELAY_INTEREST' ? 'Monthly Delay Interest' : c.chosen_remedy === 'REFUND' ? 'Full Refund' : 'Undecided'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center md:flex-col lg:flex-row gap-4 shrink-0">
                      {isDelayed ? (
                        <div className="px-3 py-1.5 bg-accent-warning-bg border border-accent-warning/40 text-accent-warning font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 self-start">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{c.days_delayed} Days Delayed</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 bg-accent-primary-bg border border-accent-primary/40 text-accent-primary font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 self-start">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>On Schedule</span>
                        </div>
                      )}

                      <Link
                        to={`/cases/${c.id}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-xs font-mono uppercase tracking-wider border border-accent-primary transition-colors text-center"
                      >
                        <span>Open Case Dossier</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Add Case Modal */}
      <AddCaseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCaseCreated={() => fetchCases()}
      />

    </div>
  );
};
