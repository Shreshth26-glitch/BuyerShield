import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyebrowLabel } from '../components/EyebrowLabel';
import { Badge } from '../components/Badge';
import { StatBlock } from '../components/StatBlock';
import { NumberedColumn } from '../components/NumberedColumn';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  FileText,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { gsap, prefersReducedMotion } from '../utils/motion';

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

export const CaseDetailPage = () => {
  const { id } = useParams();
  const { authFetch } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inline Payment Form State
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [paymentNote, setPaymentNote] = useState('');
  const [loggingPayment, setLoggingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const statsRowRef = useRef(null);
  const timelineRef = useRef(null);

  const fetchCase = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/cases/${id}`);
      if (res.status === 404) {
        setError('Case dossier not found or you do not have permission to view it.');
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setCaseData(json.data);
      } else {
        setError(json.error || 'Failed to retrieve case details.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error connecting to registry server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [id]);

  // Motion reveal
  useEffect(() => {
    if (loading || !caseData || prefersReducedMotion()) return;

    if (statsRowRef.current) {
      gsap.fromTo(
        statsRowRef.current.children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease: 'power2.out' }
      );
    }

    if (timelineRef.current) {
      gsap.fromTo(
        timelineRef.current.children,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out', delay: 0.15 }
      );
    }
  }, [loading, caseData]);

  // Add Payment Handler
  const handleAddPayment = async (e) => {
    e.preventDefault();
    setPaymentError('');
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Enter a valid positive installment amount.');
      return;
    }
    if (!paymentDate) {
      setPaymentError('Payment date is required.');
      return;
    }

    setLoggingPayment(true);
    try {
      const res = await authFetch(`/api/cases/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          paid_on: paymentDate,
          note: paymentNote,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        // Refresh case data
        await fetchCase();
        setPaymentAmount('');
        setPaymentNote('');
        setShowAddPayment(false);
      } else {
        setPaymentError(json.error || 'Could not record payment.');
      }
    } catch (err) {
      console.error(err);
      setPaymentError('Network error recording payment.');
    } finally {
      setLoggingPayment(false);
    }
  };

  // Delete Payment Handler
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Delete this payment record from the ledger?')) return;

    try {
      const res = await authFetch(`/api/cases/${id}/payments/${paymentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchCase();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to delete payment');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting payment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-page flex items-center justify-center p-6">
        <div className="font-mono text-xs uppercase tracking-eyebrow text-text-secondary">
          Compiling statutory case ledger...
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-page flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-accent-warning mx-auto" />
          <h2 className="font-serif text-xl font-bold text-text-primary">Dossier Inaccessible</h2>
          <p className="text-text-secondary text-sm">{error || 'Case not found.'}</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-[#F7F2E9] text-xs font-mono uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  const isDelayed = caseData.days_delayed > 0;
  const isVerified = Boolean(caseData.last_synced_at);

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] bg-page pb-20">
      
      {/* Dossier Header Bar */}
      <div className="w-full bg-card border-b border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-accent-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Case Workspace</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <EyebrowLabel variant="primary" text="SECTION 18 CASE DOSSIER" />
                <Badge variant="primary">{caseData.state}</Badge>
                {isVerified ? (
                  <Badge variant="neutral">Verified from {caseData.state} RERA</Badge>
                ) : (
                  <Badge variant="warning">Self-Reported / Unverified</Badge>
                )}
                <span className="font-mono text-xs bg-page px-2.5 py-0.5 border border-border text-text-primary font-bold">
                  {caseData.rera_number}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
                {caseData.project_name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-secondary mt-2">
                <span>Promoter: <strong className="text-text-primary">{caseData.developer_name}</strong></span>
                <span>•</span>
                <span>Remedy: <strong className="text-text-primary font-bold">{caseData.chosen_remedy === 'DELAY_INTEREST' ? 'Monthly Delay Interest (Option A)' : caseData.chosen_remedy === 'REFUND' ? 'Full Refund (Option B)' : 'Undecided'}</strong></span>
              </div>
            </div>

            {/* Status Indicator Badge */}
            <div className="flex items-center gap-3">
              {isDelayed ? (
                <div className="px-4 py-2 bg-accent-warning-bg border border-accent-warning/50 text-accent-warning flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold">
                  <Clock className="w-4 h-4" />
                  <span>Possession Delayed • Statutory Remedy Active</span>
                </div>
              ) : (
                <div className="px-4 py-2 bg-accent-primary-bg border border-accent-primary/50 text-accent-primary flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>On Schedule (Within Agreed Target)</span>
                </div>
              )}
            </div>
          </div>

          {/* Three-Stat Row using <StatBlock> (Mono values) */}
          <div
            ref={statsRowRef}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 mt-6 border-t border-border"
          >
            <StatBlock
              label="Promised Possession Date"
              value={formatDate(caseData.promised_date_from_agreement)}
              sublabel="As stipulated in registered agreement"
            />
            <StatBlock
              label="Accrued Delay Duration"
              value={`${caseData.days_delayed} Days`}
              sublabel={isDelayed ? "Overdue beyond contractual deadline" : "Contract deadline unbreached"}
              variant={isDelayed ? "warning" : "primary"}
            />
            <StatBlock
              label="Total Capital Paid"
              value={formatINR(caseData.total_paid)}
              sublabel={`Across ${caseData.payments ? caseData.payments.length : 0} documented disbursement(s)`}
              variant="primary"
            />
          </div>

        </div>
      </div>

      {/* Main Dossier Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        
        {/* =================================================================== */}
        {/* 1. STRUCTURAL TIMELINE & PROGRESS MILESTONES                        */}
        {/* =================================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <EyebrowLabel variant="primary" text="CONTRACTUAL HORIZON" className="mb-1" />
              <h2 className="font-serif text-xl font-bold text-text-primary">
                Possession Milestone Status
              </h2>
            </div>
            <span className="font-mono text-xs text-text-secondary">
              Status Benchmark: {isDelayed ? 'Default Occurred' : 'Pre-Default'}
            </span>
          </div>

          <div
            ref={timelineRef}
            className="grid grid-cols-1 md:grid-cols-3 border border-border bg-border divide-y md:divide-y-0 md:divide-x divide-border"
          >
            <NumberedColumn
              number="01"
              eyebrow="AGREEMENT EXECUTED"
              title="Statutory Baseline Locked"
              description="Agreement for Sale registered with promoter. Contractual date establishes the irreversible benchmark for Section 18 claims."
              variant="primary"
            >
              <div className="font-mono text-xs text-text-secondary">
                Agreement Date: <span className="text-text-primary">{formatDate(caseData.promised_date_from_agreement)}</span>
              </div>
            </NumberedColumn>

            <NumberedColumn
              number="02"
              eyebrow="UNDER CONSTRUCTION"
              title="Disbursement & Progress"
              description="Promoter undertakes civil development. In Phase 3, this stage links to automated state quarterly progress reports (QPRs)."
              variant="primary"
            >
              <div className="font-mono text-xs text-text-secondary">
                Registered Target: <span className="text-text-primary">{formatDate(caseData.registered_possession_date)}</span>
              </div>
            </NumberedColumn>

            <NumberedColumn
              number="03"
              eyebrow="HANDOVER WITH OC"
              title={isDelayed ? "Possession Overdue" : "Pending Possession Target"}
              description={
                isDelayed
                  ? `Target exceeded by ${caseData.days_delayed} days without Occupancy Certificate. Allottee right to monthly interest or refund is absolute.`
                  : "Promoter has until agreed contractual date to deliver possession with certified Occupancy Certificate."
              }
              variant={isDelayed ? "warning" : "primary"}
            >
              <div className="font-mono text-xs">
                {isDelayed ? (
                  <span className="text-accent-warning font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Breach of Contract Active</span>
                  </span>
                ) : (
                  <span className="text-accent-primary font-bold">
                    Within Grace & Agreed Limit
                  </span>
                )}
              </div>
            </NumberedColumn>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. PAYMENT HISTORY & DISBURSEMENT LEDGER                           */}
        {/* =================================================================== */}
        <div className="bg-card border border-border p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <EyebrowLabel variant="primary" text="FINANCIAL AUDIT" />
                <Badge variant="primary">SECTION 18 BASE</Badge>
              </div>
              <h2 className="font-serif text-2xl font-bold text-text-primary">
                Payment History & Installment Ledger
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                All statutory interest calculations under Section 18 compound upon the exact date each rupee was received by the builder.
              </p>
            </div>

            <button
              onClick={() => setShowAddPayment(!showAddPayment)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-xs font-mono uppercase tracking-wider border border-accent-primary transition-colors self-start sm:self-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddPayment ? 'Cancel' : 'Log Installment'}</span>
            </button>
          </div>

          {/* Inline "Add Payment" Form */}
          {showAddPayment && (
            <form
              onSubmit={handleAddPayment}
              className="mt-6 p-5 bg-page border border-border space-y-4 animate-fade-in"
            >
              <div className="font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold">
                Record New Payment Disbursement
              </div>

              {paymentError && (
                <div className="p-3 bg-accent-warning-bg border border-accent-warning/30 text-accent-warning text-xs font-mono">
                  {paymentError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full px-3 py-2 bg-card border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                    Date Paid (Receipt Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                    Milestone / Receipt Note
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. 5th Slab Demand Note"
                    className="w-full px-3 py-2 bg-card border border-border text-sm text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loggingPayment}
                  className="px-5 py-2 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-xs font-medium border border-accent-primary disabled:opacity-50 transition-colors"
                >
                  {loggingPayment ? 'Logging...' : 'Confirm & Add to Ledger'}
                </button>
              </div>
            </form>
          )}

          {/* Hairline-Divided Payments Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-mono uppercase tracking-eyebrow text-text-secondary bg-page">
                  <th className="py-3 px-4">Disbursement Date</th>
                  <th className="py-3 px-4">Installment Amount</th>
                  <th className="py-3 px-4">Milestone / Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {!caseData.payments || caseData.payments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-text-secondary font-mono text-xs">
                      No payment records logged yet. Click "Log Installment" to record your disbursements.
                    </td>
                  </tr>
                ) : (
                  caseData.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-page/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-text-primary">
                        {formatDate(p.paid_on)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-text-primary">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary text-xs">
                        {p.note || 'Direct developer bank transfer'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          title="Delete payment record"
                          className="text-text-secondary hover:text-accent-warning p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {caseData.payments && caseData.payments.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-page font-mono text-xs font-bold text-text-primary">
                    <td className="py-3 px-4">TOTAL AUDITED PAID</td>
                    <td className="py-3 px-4 text-accent-primary">{formatINR(caseData.total_paid)}</td>
                    <td colSpan="2" className="py-3 px-4 text-right text-text-secondary font-normal">
                      Verified Base for Sec 18 Delay Computation
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. FUTURE SCOPE PLACEHOLDERS (Phase 5 & 6 Coming Soon)             */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Phase 5: Legal Basis & Precedents Placeholder */}
          <div className="border border-border/70 bg-card/60 p-6 opacity-75 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-text-secondary">
                PHASE 5 PREVIEW • COMING SOON
              </span>
              <Badge variant="neutral">RAG Search</Badge>
            </div>
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-text-secondary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-serif text-lg font-bold text-text-primary mb-1">
                  Legal Basis & Tribunal Precedents
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  In upcoming Phase 5, this section will automatically surface verified MahaRERA and K-RERA judicial precedents involving {caseData.developer_name} or comparable delay durations.
                </p>
              </div>
            </div>
          </div>

          {/* Phase 6: Form M Complaint Draft Placeholder */}
          <div className="border border-border/70 bg-card/60 p-6 opacity-75 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-text-secondary">
                PHASE 6 PREVIEW • COMING SOON
              </span>
              <Badge variant="neutral">Draft Skeleton</Badge>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-text-secondary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-serif text-lg font-bold text-text-primary mb-1">
                  Statutory Complaint Dossier (Form M)
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  In Phase 6, compile your audited timeline and payment receipts into an exportable Section 31 complaint ready for submission before the Adjudicating Officer.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
