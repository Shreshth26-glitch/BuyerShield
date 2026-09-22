import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyebrowLabel } from '../components/EyebrowLabel';
import { Badge } from '../components/Badge';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Scale,
} from 'lucide-react';

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

export const AdminInterestRatesPage = () => {
  const { user, authFetch } = useAuth();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Form State (Add / Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formState, setFormState] = useState({
    state: 'Maharashtra',
    benchmark_name: 'SBI Highest MCLR',
    benchmark_rate_source: 'State Bank of India 1-Year MCLR',
    benchmark_rate_value: '9.10',
    added_percentage: '2.00',
    effective_from: new Date().toISOString().substring(0, 10),
    source_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/admin/interest-rates');
      if (res.status === 403) {
        setError('Administrative credentials required.');
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setPolicies(json.data || []);
      } else {
        setError(json.error || 'Failed to load interest rate policies.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error connecting to policy registry.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleOpenAdd = () => {
    setEditingPolicy(null);
    setFormState({
      state: 'Maharashtra',
      benchmark_name: 'SBI Highest MCLR',
      benchmark_rate_source: 'State Bank of India 1-Year MCLR',
      benchmark_rate_value: '9.10',
      added_percentage: '2.00',
      effective_from: new Date().toISOString().substring(0, 10),
      source_url: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingPolicy(p);
    setFormState({
      state: p.state,
      benchmark_name: p.benchmark_name,
      benchmark_rate_source: p.benchmark_rate_source || '',
      benchmark_rate_value: String(p.benchmark_rate_value),
      added_percentage: String(p.added_percentage),
      effective_from: p.effective_from ? p.effective_from.substring(0, 10) : '',
      source_url: p.source_url || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const rateVal = parseFloat(formState.benchmark_rate_value);
    const addedVal = parseFloat(formState.added_percentage);

    if (isNaN(rateVal) || rateVal <= 0) {
      setFormError('Benchmark rate value must be a positive percentage.');
      setSubmitting(false);
      return;
    }

    if (isNaN(addedVal) || addedVal < 0) {
      setFormError('Added percentage must be a valid non-negative number.');
      setSubmitting(false);
      return;
    }

    try {
      const url = editingPolicy
        ? `/api/admin/interest-rates/${editingPolicy.id}`
        : '/api/admin/interest-rates';
      const method = editingPolicy ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          state: formState.state,
          benchmark_name: formState.benchmark_name,
          benchmark_rate_source: formState.benchmark_rate_source,
          benchmark_rate_value: rateVal,
          added_percentage: addedVal,
          effective_from: formState.effective_from,
          source_url: formState.source_url,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: editingPolicy
            ? `Policy for ${formState.state} updated successfully.`
            : `New policy for ${formState.state} created successfully.`,
        });
        setShowModal(false);
        fetchPolicies();
      } else {
        setFormError(json.error || 'Failed to save policy.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error saving policy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, stateName) => {
    if (!window.confirm(`Delete the interest rate policy for ${stateName}?`)) return;

    try {
      const res = await authFetch(`/api/admin/interest-rates/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: `Policy #${id} removed from registry.`,
        });
        fetchPolicies();
      } else {
        setActionFeedback({
          type: 'warning',
          message: json.error || 'Failed to delete policy.',
        });
      }
    } catch (err) {
      console.error(err);
      setActionFeedback({
        type: 'warning',
        message: 'Network error deleting policy.',
      });
    }
  };

  // Role Guard
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-page flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-accent-warning mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-text-primary">
            Restricted Configuration Console
          </h2>
          <p className="text-text-secondary text-sm">
            Statutory interest rate policy curation is restricted to administrative personnel.
          </p>
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] bg-page pb-20">
      
      {/* Header Bar */}
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
              <div className="flex items-center gap-2.5 mb-2">
                <EyebrowLabel variant="primary" text="ADMINISTRATIVE REGISTRY" />
                <Badge variant="primary">SECTION 18 RATES</Badge>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
                State Interest Rate Policy Registry
              </h1>
              <p className="text-xs text-text-secondary mt-1 max-w-2xl font-sans">
                Curate official state-notified interest rates (e.g. MahaRERA Rule 18, K-RERA Rule 16). These parameters feed the pure deterministic Section 18 calculation engine across all buyer cases.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-xs font-mono uppercase tracking-wider border border-accent-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rate Policy</span>
              </button>
            </div>
          </div>

          {/* Institutional Advisory Note */}
          <div className="mt-6 pt-6 border-t border-border flex items-start gap-3 bg-page p-4 border text-xs text-text-secondary font-mono">
            <Scale className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-text-primary uppercase tracking-wider">Periodic Human Curation Required:</strong>{' '}
              State RERA rules tie statutory interest to bank lending rates (commonly State Bank of India's Highest MCLR + 2.00%). As the Reserve Bank of India adjusts repo rates and SBI revises its MCLR schedules, update these policies with the latest bank publications and official circular URLs.
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
        
        {/* Action Feedback Toast */}
        {actionFeedback && (
          <div
            className={`p-4 border font-mono text-xs flex items-center justify-between gap-3 ${
              actionFeedback.type === 'success'
                ? 'bg-accent-primary-bg border-accent-primary/40 text-accent-primary'
                : 'bg-accent-warning-bg border-accent-warning/40 text-accent-warning'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-text-secondary hover:text-text-primary text-[11px] uppercase font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Policies Table */}
        <div className="bg-card border border-border overflow-hidden">
          {error ? (
            <div className="p-8 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-accent-warning mx-auto" />
              <div className="font-serif text-lg font-bold text-text-primary">{error}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] font-mono uppercase tracking-eyebrow text-text-secondary bg-page">
                    <th className="py-3 px-4">State Jurisdiction</th>
                    <th className="py-3 px-4">Benchmark Name & Source</th>
                    <th className="py-3 px-4">Base Rate</th>
                    <th className="py-3 px-4">Statutory Spread</th>
                    <th className="py-3 px-4">Total Statutory Rate</th>
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-4">Authority Source</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs font-mono">
                  {loading && policies.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-text-secondary uppercase tracking-eyebrow">
                        Loading statutory policy records...
                      </td>
                    </tr>
                  ) : policies.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-text-secondary">
                        No interest rate policies configured yet. Click "Add Rate Policy" to create one.
                      </td>
                    </tr>
                  ) : (
                    policies.map((p) => (
                      <tr key={p.id} className="hover:bg-page/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-text-primary">
                          <Badge variant={p.state === 'Maharashtra' ? 'primary' : 'neutral'}>
                            {p.state}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-text-primary">{p.benchmark_name}</div>
                          <div className="text-[11px] text-text-secondary font-sans">
                            {p.benchmark_rate_source || 'Standard Notification'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-text-primary font-bold">
                          {p.benchmark_rate_value.toFixed(2)}%
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary">
                          +{p.added_percentage.toFixed(2)}%
                        </td>
                        <td className="py-3.5 px-4 font-bold text-accent-primary text-sm">
                          {p.total_rate.toFixed(2)}%
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary">
                          {formatDate(p.effective_from)}
                        </td>
                        <td className="py-3.5 px-4">
                          {p.source_url ? (
                            <a
                              href={p.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-accent-primary hover:underline text-[11px]"
                            >
                              <span>Official Circular</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-text-secondary italic">None logged</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
                            title="Edit policy"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.state)}
                            className="p-1 text-text-secondary hover:text-accent-warning transition-colors"
                            title="Delete policy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border max-w-lg w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-xl font-bold text-text-primary">
                {editingPolicy ? `Edit Rate Policy #${editingPolicy.id}` : 'Configure New State Policy'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-secondary hover:text-text-primary font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-accent-warning-bg border border-accent-warning/30 text-accent-warning text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                    State Jurisdiction *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.state}
                    onChange={(e) => setFormState({ ...formState, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-2 bg-page border border-border text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                    Effective From Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.effective_from}
                    onChange={(e) => setFormState({ ...formState, effective_from: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-border text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                  Benchmark Name *
                </label>
                <input
                  type="text"
                  required
                  value={formState.benchmark_name}
                  onChange={(e) => setFormState({ ...formState, benchmark_name: e.target.value })}
                  placeholder="e.g. SBI Highest MCLR"
                  className="w-full px-3 py-2 bg-page border border-border text-text-primary focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                  Benchmark Description / Legal Source
                </label>
                <input
                  type="text"
                  value={formState.benchmark_rate_source}
                  onChange={(e) => setFormState({ ...formState, benchmark_rate_source: e.target.value })}
                  placeholder="e.g. State Bank of India 1-Year MCLR as notified under Rule 18"
                  className="w-full px-3 py-2 bg-page border border-border text-text-primary focus:outline-none focus:border-accent-primary font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                    Base Benchmark Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formState.benchmark_rate_value}
                    onChange={(e) => setFormState({ ...formState, benchmark_rate_value: e.target.value })}
                    placeholder="e.g. 9.10"
                    className="w-full px-3 py-2 bg-page border border-border text-text-primary focus:outline-none focus:border-accent-primary font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                    Statutory Spread Added (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formState.added_percentage}
                    onChange={(e) => setFormState({ ...formState, added_percentage: e.target.value })}
                    placeholder="e.g. 2.00"
                    className="w-full px-3 py-2 bg-page border border-border text-text-primary focus:outline-none focus:border-accent-primary font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-eyebrow text-text-secondary mb-1">
                  Official Notification / Circular URL
                </label>
                <input
                  type="url"
                  value={formState.source_url}
                  onChange={(e) => setFormState({ ...formState, source_url: e.target.value })}
                  placeholder="https://maharera.maharashtra.gov.in/circulars/..."
                  className="w-full px-3 py-2 bg-page border border-border text-text-primary focus:outline-none focus:border-accent-primary font-sans"
                />
              </div>

              <div className="p-3 bg-page border border-border text-text-secondary text-[11px]">
                Calculated Total Statutory Rate:{' '}
                <strong className="text-accent-primary text-sm font-bold">
                  {(
                    (parseFloat(formState.benchmark_rate_value) || 0) +
                    (parseFloat(formState.added_percentage) || 0)
                  ).toFixed(2)}
                  %
                </strong>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border text-text-secondary hover:bg-page transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] border border-accent-primary disabled:opacity-50 transition-colors uppercase tracking-wider font-semibold"
                >
                  {submitting ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
