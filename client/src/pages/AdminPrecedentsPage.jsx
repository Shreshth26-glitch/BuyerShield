import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyebrowLabel } from '../components/EyebrowLabel';
import { Badge } from '../components/Badge';
import { StatBlock } from '../components/StatBlock';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Sparkles,
  FileText,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';

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

export const AdminPrecedentsPage = () => {
  const { user, authFetch } = useAuth();

  const [precedents, setPrecedents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [remedyFilter, setRemedyFilter] = useState('');
  const [unembeddedOnly, setUnembeddedOnly] = useState(false);

  // Extraction & Ingestion Modal State
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [rawText, setRawText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractError, setExtractError] = useState('');

  // Structured fields proposal (Extraction proposes, human disposes)
  const [formFields, setFormFields] = useState({
    state: 'Maharashtra',
    orderDate: new Date().toISOString().substring(0, 10),
    remedyType: 'withdraw',
    outcomeType: 'REFUND_ORDERED',
    delayMonths: '24',
    amountPaidPercentage: '90.0',
    awardedAmount: '',
    interestRate: '11.10',
    sourceUrl: '',
    summary: '',
  });

  const fetchPrecedents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (stateFilter) params.append('state', stateFilter);
      if (remedyFilter) params.append('remedyType', remedyFilter);
      if (unembeddedOnly) params.append('unembedded', 'true');

      const res = await authFetch(`/api/admin/precedents?${params.toString()}`);
      if (res.status === 403) {
        setError('Administrative credentials required.');
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setPrecedents(json.data || []);
        setTotalCount(json.total || 0);
      } else {
        setError(json.error || 'Failed to load precedents directory.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error connecting to precedent registry.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, searchTerm, stateFilter, remedyFilter, unembeddedOnly]);

  useEffect(() => {
    fetchPrecedents();
  }, [fetchPrecedents]);

  const handleExtractFromText = async () => {
    if (!rawText.trim()) {
      setExtractError('Paste or type raw tribunal order text first.');
      return;
    }
    setExtracting(true);
    setExtractError('');
    try {
      const res = await authFetch('/api/admin/precedents/extract', {
        method: 'POST',
        body: JSON.stringify({ rawText }),
      });
      const json = await res.json();
      if (res.ok) {
        const extracted = json.data;
        setFormFields({
          state: extracted.state || 'Maharashtra',
          orderDate: extracted.orderDate || new Date().toISOString().substring(0, 10),
          remedyType: extracted.remedyType || 'withdraw',
          outcomeType: extracted.outcomeType || 'REFUND_ORDERED',
          delayMonths: extracted.delayMonths !== null ? String(extracted.delayMonths) : '24',
          amountPaidPercentage: extracted.amountPaidPercentage !== null ? String(extracted.amountPaidPercentage) : '90.0',
          awardedAmount: extracted.awardedAmount ? String(extracted.awardedAmount) : '',
          interestRate: extracted.interestRate ? String(extracted.interestRate) : '11.10',
          sourceUrl: formFields.sourceUrl || '',
          summary: extracted.summary || '',
        });
      } else {
        setExtractError(json.error || 'Failed to extract structured fields.');
      }
    } catch (err) {
      console.error(err);
      setExtractError('Extraction service network failure.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSavePrecedent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setExtractError('');
    try {
      const payload = {
        ...formFields,
        delayMonths: parseInt(formFields.delayMonths, 10),
        amountPaidPercentage: parseFloat(formFields.amountPaidPercentage),
        awardedAmount: formFields.awardedAmount ? parseFloat(formFields.awardedAmount) : null,
        interestRate: formFields.interestRate ? parseFloat(formFields.interestRate) : null,
      };

      const res = await authFetch('/api/admin/precedents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Saved order #${json.data.id} with embedding.`,
        });
        setShowExtractModal(false);
        setRawText('');
        fetchPrecedents();
      } else {
        setExtractError(json.error || 'Failed to save precedent.');
      }
    } catch (err) {
      console.error(err);
      setExtractError('Network error saving precedent.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrecedent = async (id) => {
    if (!window.confirm(`Permanently remove precedent #${id} from the database?`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/admin/precedents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Deleted precedent #${id}.` });
        fetchPrecedents();
      } else {
        const json = await res.json();
        setFeedback({ type: 'error', message: json.error || 'Failed to delete.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error deleting precedent.' });
    }
  };

  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Top Header / Breadcrumbs */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dossiers</span>
            </Link>
            <span className="text-border">|</span>
            <span className="font-mono text-xs uppercase tracking-eyebrow text-text-secondary">
              ADMINISTRATION
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="primary">ADMIN PRIVILEGES</Badge>
            <span className="text-xs font-mono text-text-secondary">
              {user?.email}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Page Title & Summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <EyebrowLabel variant="primary" text="LEGAL INTELLIGENCE LAYER" />
              <Badge variant="neutral">PHASE 5</Badge>
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-text-primary">
              Tribunal Precedents & RAG Corpus
            </h1>
            <p className="text-xs text-text-secondary max-w-2xl mt-1 font-sans leading-relaxed">
              Curate, review, and embed past MahaRERA and Karnataka RERA tribunal orders. The RAG retrieval pipeline uses these structured facts and embeddings to ground buyer Section 18 calculations.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => {
                setExtractError('');
                setShowExtractModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-xs font-mono uppercase tracking-wider border border-accent-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload & Ingest Precedent</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 border text-xs font-mono flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-accent-primary-bg border-accent-primary/40 text-accent-primary'
                : 'bg-accent-warning-bg border-accent-warning/40 text-accent-warning'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-text-secondary hover:text-text-primary ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-accent-warning-bg border border-accent-warning/40 text-accent-warning text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-card border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search orders, rulings, or holdings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
              />
            </div>

            {/* State Filter */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-1.5 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
            >
              <option value="">All State Authorities</option>
              <option value="Maharashtra">Maharashtra (MahaRERA)</option>
              <option value="Karnataka">Karnataka (K-RERA)</option>
            </select>

            {/* Remedy Filter */}
            <select
              value={remedyFilter}
              onChange={(e) => setRemedyFilter(e.target.value)}
              className="px-3 py-1.5 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
            >
              <option value="">All Remedy Types</option>
              <option value="withdraw">Withdrawal / Refund</option>
              <option value="continue">Continue / Monthly Interest</option>
            </select>

            {/* Unembedded checkbox */}
            <label className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={unembeddedOnly}
                onChange={(e) => setUnembeddedOnly(e.target.checked)}
                className="rounded-none border-border"
              />
              <span>Missing Embeddings Only</span>
            </label>
          </div>

          <div className="text-xs font-mono text-text-secondary whitespace-nowrap">
            Showing {precedents.length} of {totalCount} Usable Orders
          </div>
        </div>

        {/* Precedents Table */}
        <div className="bg-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-page border-b border-border text-[11px] uppercase tracking-eyebrow text-text-secondary">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Remedy</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-center">Delay</th>
                  <th className="py-3 px-4 text-center">Paid %</th>
                  <th className="py-3 px-4 text-right">Awarded (₹)</th>
                  <th className="py-3 px-4 text-center">Rate</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-text-secondary">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent-primary" />
                      Loading precedents directory...
                    </td>
                  </tr>
                ) : precedents.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-text-secondary">
                      No matching tribunal orders found. Use "Upload & Ingest Precedent" to add past orders.
                    </td>
                  </tr>
                ) : (
                  precedents.map((p) => (
                    <tr key={p.id} className="hover:bg-page/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-text-primary">
                        #{p.id}
                      </td>
                      <td className="py-3 px-4 text-text-secondary font-semibold">
                        {p.state}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={p.remedy_type === 'withdraw' ? 'primary' : 'warning'}>
                          {p.remedy_type || '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-text-primary">
                        {p.outcome_type || '—'}
                      </td>
                      <td className="py-3 px-4 text-center text-text-primary font-bold">
                        {p.delay_months !== null ? `${p.delay_months}m` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center text-text-secondary">
                        {p.amount_paid_percentage !== null ? `${p.amount_paid_percentage}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-text-primary">
                        {p.awarded_amount ? formatINR(p.awarded_amount) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center text-accent-primary font-bold">
                        {p.interest_rate ? `${p.interest_rate}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {formatDate(p.order_date)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.source_url && (
                            <a
                              href={p.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-text-secondary hover:text-accent-primary"
                              title="View official order source"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeletePrecedent(p.id)}
                            className="text-text-secondary hover:text-accent-warning"
                            title="Delete precedent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Human-in-the-Loop Ingestion Modal */}
      {showExtractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card border border-border max-w-3xl w-full p-6 space-y-6 animate-fade-in my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-eyebrow text-text-secondary font-semibold">
                  HUMAN-IN-THE-LOOP INGESTION
                </div>
                <h3 className="font-serif text-xl font-bold text-text-primary">
                  Extract & Ingest Tribunal Precedent
                </h3>
              </div>
              <button
                onClick={() => setShowExtractModal(false)}
                className="text-text-secondary hover:text-text-primary font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {/* Extraction Error */}
            {extractError && (
              <div className="p-3 bg-accent-warning-bg border border-accent-warning/40 text-accent-warning text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{extractError}</span>
              </div>
            )}

            {/* Step 1: Raw Order Text */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary">
                1. Paste Raw Order PDF Text or Tribunal Decision
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste verbatim tribunal text, complaint order, or holding here..."
                className="w-full p-3 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleExtractFromText}
                  disabled={extracting || !rawText.trim()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-page hover:bg-card border border-border text-xs font-mono uppercase tracking-wider text-text-primary disabled:opacity-50 transition-colors"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${extracting ? 'animate-spin' : ''}`} />
                  <span>{extracting ? 'Extracting Fields...' : 'Extract Structured Facts (AI)'}</span>
                </button>
              </div>
            </div>

            {/* Step 2: Human Review & Edit (Admin Disposes) */}
            <form onSubmit={handleSavePrecedent} className="space-y-4 pt-4 border-t border-border">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-primary">
                2. Review & Confirm Structured Fields
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    State Jurisdiction
                  </label>
                  <select
                    value={formFields.state}
                    onChange={(e) => setFormFields({ ...formFields, state: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  >
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    Remedy Type
                  </label>
                  <select
                    value={formFields.remedyType}
                    onChange={(e) => setFormFields({ ...formFields, remedyType: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  >
                    <option value="withdraw">Withdraw (Refund)</option>
                    <option value="continue">Continue (Monthly Interest)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    Outcome Type
                  </label>
                  <input
                    type="text"
                    value={formFields.outcomeType}
                    onChange={(e) => setFormFields({ ...formFields, outcomeType: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    Delay (Months)
                  </label>
                  <input
                    type="number"
                    value={formFields.delayMonths}
                    onChange={(e) => setFormFields({ ...formFields, delayMonths: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    Disbursed Paid (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formFields.amountPaidPercentage}
                    onChange={(e) => setFormFields({ ...formFields, amountPaidPercentage: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    Awarded Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formFields.awardedAmount}
                    onChange={(e) => setFormFields({ ...formFields, awardedAmount: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    Interest Rate (% p.a.)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={formFields.interestRate}
                    onChange={(e) => setFormFields({ ...formFields, interestRate: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={formFields.orderDate}
                    onChange={(e) => setFormFields({ ...formFields, orderDate: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                    Official Order URL
                  </label>
                  <input
                    type="url"
                    value={formFields.sourceUrl}
                    onChange={(e) => setFormFields({ ...formFields, sourceUrl: e.target.value })}
                    placeholder="https://maharera.maharashtra.gov.in/orders/..."
                    className="w-full px-3 py-2 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                  Legal Holding Summary (Embedded in RAG Vector Space)
                </label>
                <textarea
                  rows={3}
                  value={formFields.summary}
                  onChange={(e) => setFormFields({ ...formFields, summary: e.target.value })}
                  className="w-full p-2.5 bg-page border border-border text-xs font-mono focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowExtractModal(false)}
                  className="px-4 py-2 border border-border text-xs font-mono uppercase tracking-wider text-text-secondary hover:bg-page transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formFields.summary.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-accent-primary text-[#F7F2E9] text-xs font-mono uppercase tracking-wider border border-accent-primary hover:bg-[#162D20] disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saving ? 'Generating Embedding & Saving...' : 'Confirm & Save Usable Precedent'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
