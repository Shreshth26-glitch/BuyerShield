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
  RefreshCw,
  History,
  Info,
} from 'lucide-react';
import { RemedyDisclaimer } from '../components/RemedyDisclaimer';
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

  // On-demand portal sync state
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null); // { type: 'success' | 'warning' | 'error', message: string }

  // Section 18 Remedy Calculator State
  const [remedyData, setRemedyData] = useState(null);
  const [calculatingRemedy, setCalculatingRemedy] = useState(false);
  const [remedyError, setRemedyError] = useState(null);
  const [remedyHistory, setRemedyHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchRemedyHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await authFetch(`/api/cases/${id}/remedy-history`);
      if (res.ok) {
        const json = await res.json();
        setRemedyHistory(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch calculation history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCalculateRemedy = async () => {
    setCalculatingRemedy(true);
    setRemedyError(null);
    try {
      const res = await authFetch(`/api/cases/${id}/calculate-remedy`, {
        method: 'POST',
        body: JSON.stringify({ remedyType: 'both' }),
      });
      const json = await res.json();
      if (res.ok) {
        setRemedyData(json.data);
        fetchRemedyHistory();
      } else {
        setRemedyError(json.error || 'Failed to compute Section 18 remedies.');
      }
    } catch (err) {
      console.error('Remedy calculation error:', err);
      setRemedyError('Network error connecting to statutory calculator.');
    } finally {
      setCalculatingRemedy(false);
    }
  };

  const statsRowRef = useRef(null);
  const timelineRef = useRef(null);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await authFetch(`/api/cases/${id}/sync`, { method: 'POST' });
      const json = await res.json();

      if (res.status === 429) {
        setSyncFeedback({
          type: 'warning',
          message: json.error || 'Rate limit active. Please try again later.',
        });
      } else if (res.ok) {
        if (json.data) {
          setCaseData(json.data);
        }
        if (json.syncResult?.success) {
          setSyncFeedback({
            type: 'success',
            message: `Verified against official ${json.data?.state || ''} RERA portal disclosures.`,
          });
        } else {
          setSyncFeedback({
            type: 'warning',
            message: "We couldn't verify this project against the official portal yet — your entered details are still saved.",
          });
        }
      } else {
        setSyncFeedback({
          type: 'warning',
          message: json.error || "We couldn't verify this project against the official portal yet — your entered details are still saved.",
        });
      }
    } catch (err) {
      console.error(err);
      setSyncFeedback({
        type: 'warning',
        message: "We couldn't connect to the verification service. Your entered details are safe.",
      });
    } finally {
      setSyncing(false);
    }
  };


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
        if (json.data && json.data.days_delayed > 0) {
          handleCalculateRemedy();
        }
        fetchRemedyHistory();
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
                  <span className="font-mono text-xs text-accent-primary flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified {formatDate(caseData.last_synced_at)} via {caseData.state} RERA</span>
                  </span>
                ) : (
                  <span className="font-mono text-xs text-text-secondary italic">
                    Unverified — self-reported data
                  </span>
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

            {/* Action & Status Indicator Area */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                title="Synchronize official completion dates and progress disclosures directly from state RERA portal"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-card hover:bg-page border border-border text-xs font-mono uppercase tracking-wider text-text-primary transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-accent-primary ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Checking Portal...' : 'Sync with Portal'}</span>
              </button>

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        
        {/* Sync Feedback Toast / Banner */}
        {syncFeedback && (
          <div
            className={`p-4 border font-mono text-xs flex items-center justify-between gap-3 ${
              syncFeedback.type === 'success'
                ? 'bg-accent-primary-bg border-accent-primary/40 text-accent-primary'
                : 'bg-accent-warning-bg border-accent-warning/40 text-accent-warning'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-text-secondary hover:text-text-primary text-[11px] uppercase tracking-wider font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Reconciliation Mismatch Notice (Section 18 Governing Rule) */}
        {caseData.reconciliation_status === 'mismatched' && (
          <div className="bg-[#FFFDF7] border-l-4 border-l-accent-warning border border-border p-5 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-warning shrink-0" />
                <h3 className="font-serif text-base font-bold text-text-primary">
                  Statutory Date Discrepancy Detected
                </h3>
              </div>
              <Badge variant="warning">Mismatched With Portal</Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              The developer reported a different completion date to {caseData.state} RERA than what is stipulated in your registered agreement. Under Section 18 of the Real Estate (Regulation and Development) Act, <strong>the date in your registered agreement governs your right to delay interest or refund</strong>. Unilateral portal extensions by the promoter do not extinguish your statutory remedy.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60 font-mono text-xs">
              <div className="p-3 bg-page border border-border">
                <div className="text-text-secondary uppercase tracking-eyebrow text-[10px] mb-1">
                  Your Agreement Date (Governing Statutory Baseline)
                </div>
                <div className="text-sm font-bold text-text-primary">
                  {formatDate(caseData.promised_date_from_agreement)}
                </div>
              </div>
              <div className="p-3 bg-page border border-border">
                <div className="text-text-secondary uppercase tracking-eyebrow text-[10px] mb-1">
                  Portal Registered Date (Promoter Disclosed to {caseData.state} RERA)
                </div>
                <div className="text-sm font-bold text-accent-warning">
                  {formatDate(caseData.registered_possession_date)}
                </div>
              </div>
            </div>
          </div>
        )}

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
        {/* 3. SECTION 18 STATUTORY REMEDY CALCULATOR (YOUR OPTIONS)           */}
        {/* =================================================================== */}
        <div id="remedy-section" className="space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <EyebrowLabel variant="primary" text="SECTION 18 STATUTORY OPTIONS" />
                <Badge variant={isDelayed ? 'warning' : 'neutral'}>
                  {isDelayed ? 'REMEDY ACTIVE' : 'PRE-DEFAULT'}
                </Badge>
                {remedyData?.policy && (
                  <span className="font-mono text-xs text-accent-primary">
                    Rate: {remedyData.policy.totalRate}% p.a. ({remedyData.policy.benchmarkName} + {remedyData.policy.addedPercentage}%)
                  </span>
                )}
              </div>
              <h2 className="font-serif text-2xl font-bold text-text-primary">
                Statutory Remedy Computation
              </h2>
              <p className="text-xs text-text-secondary mt-0.5 font-sans">
                Deterministic Section 18 calculations based on your audited disbursement ledger ({formatINR(caseData.total_paid)}) and the official rate policy on record for {caseData.state}.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 self-start sm:self-center">
              {remedyHistory.length > 0 && (
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-card hover:bg-page border border-border text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
                  title="View immutable calculation audit trail"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Trail ({remedyHistory.length})</span>
                </button>
              )}

              {isDelayed && (
                <button
                  onClick={handleCalculateRemedy}
                  disabled={calculatingRemedy}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-xs font-mono uppercase tracking-wider border border-accent-primary disabled:opacity-50 transition-colors"
                  title="Re-run calculation against latest date and payment ledger"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${calculatingRemedy ? 'animate-spin' : ''}`} />
                  <span>{calculatingRemedy ? 'Calculating...' : 'Recalculate'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Permanent Civic Disclaimer Banner (Non-Dismissible) */}
          <RemedyDisclaimer
            state={caseData.state}
            benchmark={remedyData?.policy?.benchmarkName || 'SBI Highest MCLR'}
            spread={`${remedyData?.policy?.addedPercentage || '2.00'}%`}
          />

          {/* Neutrality Advisory Note */}
          <div className="bg-page border border-border px-4 py-3 text-xs font-mono text-text-secondary flex items-center gap-2">
            <Info className="w-4 h-4 text-accent-primary shrink-0" />
            <span>
              <strong>Neutral Advisory:</strong> These are your two statutory options under Section 18 of the Act, not a legal recommendation of which to choose.
            </span>
          </div>

          {/* Remedy Error Banner if any */}
          {remedyError && (
            <div className="p-4 bg-accent-warning-bg border border-accent-warning/40 text-accent-warning text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{remedyError}</span>
            </div>
          )}

          {!isDelayed ? (
            /* Pre-Default Case State */
            <div className="bg-card border border-border p-8 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-accent-primary mx-auto" />
              <h3 className="font-serif text-lg font-bold text-text-primary">
                Contractual Possession Target Unbreached
              </h3>
              <p className="text-xs text-text-secondary max-w-lg mx-auto font-sans leading-relaxed">
                The agreed delivery deadline ({formatDate(caseData.promised_date_from_agreement)}) has not yet arrived. Statutory remedies under Section 18 activate automatically if the promoter fails to deliver possession with a certified Occupancy Certificate by this target.
              </p>
            </div>
          ) : (
            /* Delayed Case: Side-by-Side Two Options */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* OPTION 01: WITHDRAW */}
                <div className="bg-card border border-border p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-accent-primary uppercase tracking-eyebrow">
                        OPTION 01 • SECTION 18(1)
                      </span>
                      <Badge variant="primary">WITHDRAW</Badge>
                    </div>

                    <h3 className="font-serif text-xl font-bold text-text-primary">
                      Withdraw from Project & Full Refund
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed font-sans">
                      Exercise your statutory right to cancel the booking and claim a 100% refund of all disbursed capital plus simple interest for the entire period held at the state-notified rate.
                    </p>

                    <div className="pt-2">
                      <StatBlock
                        label="Total Statutory Refund Entitlement"
                        value={formatINR(remedyData?.withdraw?.totalAmount)}
                        sublabel={`Principal ${formatINR(remedyData?.principalAmount || caseData.total_paid)} + Interest ${formatINR(remedyData?.withdraw?.interestAmount)}`}
                        variant="primary"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 text-xs font-mono space-y-1.5 text-text-secondary bg-page p-3 border">
                    <div className="flex justify-between">
                      <span>Audited Principal Refund:</span>
                      <strong className="text-text-primary">{formatINR(remedyData?.principalAmount || caseData.total_paid)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Simple Interest Accrued:</span>
                      <strong className="text-text-primary">{formatINR(remedyData?.withdraw?.interestAmount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Accrual Days Elapsed:</span>
                      <strong className="text-text-primary">{remedyData?.withdraw?.daysElapsed || caseData.days_delayed} Days</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Statutory Rate Applied:</span>
                      <strong className="text-accent-primary">{remedyData?.policy?.totalRate || '11.10'}% p.a.</strong>
                    </div>
                  </div>
                </div>

                {/* OPTION 02: CONTINUE & CLAIM MONTHLY DELAY INTEREST */}
                <div className="bg-card border border-border p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-accent-warning uppercase tracking-eyebrow">
                        OPTION 02 • SECTION 18(1) PROVISO
                      </span>
                      <Badge variant="warning">CONTINUE BOOKING</Badge>
                    </div>

                    <h3 className="font-serif text-xl font-bold text-text-primary">
                      Retain Unit & Claim Monthly Delay Interest
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed font-sans">
                      Keep your allotment and claim statutory interest for every single month of delay from the agreed date until physical handover with a valid Occupancy Certificate.
                    </p>

                    <div className="pt-2">
                      <StatBlock
                        label="Total Delay Interest Accrued So Far"
                        value={formatINR(remedyData?.continue?.totalAccruedSoFar)}
                        sublabel={`Benchmark run-rate: ${formatINR(remedyData?.continue?.monthlyInterestAmount)} / month`}
                        variant="warning"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 text-xs font-mono space-y-1.5 text-text-secondary bg-page p-3 border">
                    <div className="flex justify-between">
                      <span>Standard Monthly Payout:</span>
                      <strong className="text-text-primary">{formatINR(remedyData?.continue?.monthlyInterestAmount)} / mo</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Delay Cycles:</span>
                      <strong className="text-text-primary">{remedyData?.continue?.monthsElapsed || 0} Month(s)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Accrual Days:</span>
                      <strong className="text-text-primary">{remedyData?.continue?.totalDays || caseData.days_delayed} Days</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Payout Nature:</span>
                      <strong className="text-text-primary">Payable monthly (not lump sum)</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Month-by-Month Breakdown Table */}
              {remedyData?.continue?.breakdown && remedyData.continue.breakdown.length > 0 && (
                <div className="bg-card border border-border p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-eyebrow text-text-secondary font-semibold">
                        OPTION 02 ITEMIZATION SCHEDULE
                      </div>
                      <h4 className="font-serif text-lg font-bold text-text-primary">
                        Month-by-Month Accrued Delay Interest Breakdown
                      </h4>
                    </div>
                    <span className="font-mono text-xs text-text-secondary">
                      {remedyData.continue.breakdown.length} Billing Periods • Verified Zero Rounding Drift
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead className="sticky top-0 bg-page z-10">
                        <tr className="border-b border-border text-[11px] uppercase tracking-eyebrow text-text-secondary">
                          <th className="py-2.5 px-4">Billing Month</th>
                          <th className="py-2.5 px-4">Effective Date Interval</th>
                          <th className="py-2.5 px-4 text-center">Days Delayed</th>
                          <th className="py-2.5 px-4 text-right">Interest Accrued (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {remedyData.continue.breakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-page/50 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-text-primary">
                              {row.month}
                            </td>
                            <td className="py-2.5 px-4 text-text-secondary">
                              {row.startDate} → {row.endDate}
                            </td>
                            <td className="py-2.5 px-4 text-center text-text-secondary font-bold">
                              {row.days} d
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-text-primary">
                              {formatINR(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="sticky bottom-0 bg-page z-10 border-t-2 border-border font-bold">
                        <tr>
                          <td className="py-3 px-4 uppercase text-text-primary" colSpan="2">
                            TOTAL ACCRUED DELAY INTEREST
                          </td>
                          <td className="py-3 px-4 text-center text-text-primary">
                            {remedyData.continue.totalDays} Days
                          </td>
                          <td className="py-3 px-4 text-right text-accent-warning text-sm font-mono">
                            {formatINR(remedyData.continue.totalAccruedSoFar)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* =================================================================== */}
        {/* 4. FUTURE SCOPE PLACEHOLDERS (Phase 5 & 6 Coming Soon)             */}
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

      {/* Calculation Audit Trail Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border max-w-2xl w-full p-6 space-y-4 animate-fade-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-eyebrow text-text-secondary font-semibold">
                  EVIDENTIARY AUDIT LOG
                </div>
                <h3 className="font-serif text-xl font-bold text-text-primary">
                  Calculation Run History
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-text-secondary hover:text-text-primary font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-secondary font-sans leading-relaxed">
              Every execution of the Section 18 calculation engine is immutably recorded in the database. This chronological audit trail demonstrates timestamped calculations before regulatory authorities.
            </p>

            <div className="overflow-x-auto flex-1 overflow-y-auto border border-border">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="bg-page sticky top-0 border-b border-border text-[11px] uppercase tracking-eyebrow text-text-secondary">
                  <tr>
                    <th className="py-2.5 px-3">Run Timestamp</th>
                    <th className="py-2.5 px-3">Remedy Type</th>
                    <th className="py-2.5 px-3">Principal Base</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3 text-right">Computed Figure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyLoading ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-text-secondary">
                        Loading calculation audit trail...
                      </td>
                    </tr>
                  ) : remedyHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-text-secondary">
                        No prior calculations recorded on audit log.
                      </td>
                    </tr>
                  ) : (
                    remedyHistory.map((run) => (
                      <tr key={run.id} className="hover:bg-page/50">
                        <td className="py-2.5 px-3 text-text-secondary">
                          {formatDate(run.calculated_at)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold uppercase">
                          <Badge variant={run.remedy_type === 'withdraw' ? 'primary' : 'warning'}>
                            {run.remedy_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-text-primary">
                          {formatINR(run.principal_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-accent-primary font-bold">
                          {run.applicable_rate}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                          {formatINR(run.computed_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 border border-border text-xs font-mono uppercase tracking-wider text-text-secondary hover:bg-page transition-colors"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
