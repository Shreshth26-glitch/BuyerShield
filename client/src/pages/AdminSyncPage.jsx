import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyebrowLabel } from '../components/EyebrowLabel';
import { Badge } from '../components/Badge';
import { StatBlock } from '../components/StatBlock';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowLeft,
  Filter,
} from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const AdminSyncPage = () => {
  const { user, authFetch } = useAuth();

  const [stats, setStats] = useState({ last7Days: [], last30Days: [] });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Expanded error log state (set of job IDs)
  const [expandedJobs, setExpandedJobs] = useState({});

  // Retrying status per job
  const [retryingJobs, setRetryingJobs] = useState({});
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await authFetch('/api/admin/sync/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json.data || { last7Days: [], last30Days: [] });
      }
    } catch (err) {
      console.error('Failed to load sync stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [authFetch]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedState) params.append('state', selectedState);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('limit', '50');

      const res = await authFetch(`/api/admin/sync/jobs?${params.toString()}`);
      if (res.status === 403) {
        setError('Administrative privileges required to access ingestion telemetry.');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setJobs(json.data || []);
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to retrieve sync job history.');
      }
    } catch (err) {
      console.error('Network error fetching jobs:', err);
      setError('Network error connecting to telemetry pipeline.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedState, selectedStatus]);

  useEffect(() => {
    fetchStats();
    fetchJobs();
  }, [fetchStats, fetchJobs]);

  const handleRetry = async (jobId) => {
    setRetryingJobs((prev) => ({ ...prev, [jobId]: true }));
    setActionFeedback(null);
    try {
      const res = await authFetch(`/api/admin/sync/retry/${jobId}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: json.data?.success ? 'success' : 'warning',
          message: `Job #${jobId} retry completed: ${json.message || 'Processed.'}`,
        });
        // Refresh both list and stats
        fetchJobs();
        fetchStats();
      } else {
        setActionFeedback({
          type: 'warning',
          message: json.error || `Retry failed for Job #${jobId}.`,
        });
      }
    } catch (err) {
      console.error(err);
      setActionFeedback({
        type: 'warning',
        message: `Network error retrying job #${jobId}.`,
      });
    } finally {
      setRetryingJobs((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const toggleExpand = (jobId) => {
    setExpandedJobs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  // Guard against non-admin
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-page flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-accent-warning mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-text-primary">
            Restricted Telemetry Console
          </h2>
          <p className="text-text-secondary text-sm">
            Access to RERA ingestion logs and portal adapter telemetry is restricted to administrative personnel.
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

  // Calculate success rates
  const getRate = (dataset, stateName) => {
    const row = dataset.find((r) => r.state.toLowerCase() === stateName.toLowerCase());
    if (!row || Number(row.total) === 0) return 'N/A';
    const rate = (Number(row.successes) / Number(row.total)) * 100;
    return `${rate.toFixed(1)}% (${row.successes}/${row.total})`;
  };

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
                <EyebrowLabel variant="primary" text="ADMINISTRATIVE CONSOLE" />
                <Badge variant="primary">TELEMETRY</Badge>
                <span className="font-mono text-xs text-text-secondary">
                  Automated Scraper Health & Pipeline Status
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
                RERA Portal Ingestion Monitor
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  fetchStats();
                  fetchJobs();
                }}
                disabled={loading || statsLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-card hover:bg-page border border-border text-xs font-mono uppercase tracking-wider text-text-primary transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-accent-primary ${loading || statsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>
          </div>

          {/* Aggregate Telemetry Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 mt-6 border-t border-border">
            <StatBlock
              label="MahaRERA (7-Day Success)"
              value={getRate(stats.last7Days, 'Maharashtra')}
              sublabel="Maharashtra public disclosure portal"
              variant="primary"
            />
            <StatBlock
              label="K-RERA (7-Day Success)"
              value={getRate(stats.last7Days, 'Karnataka')}
              sublabel="Karnataka public disclosure portal"
              variant="primary"
            />
            <StatBlock
              label="MahaRERA (30-Day Success)"
              value={getRate(stats.last30Days, 'Maharashtra')}
              sublabel="Cumulative trailing monthly benchmark"
              variant="neutral"
            />
            <StatBlock
              label="K-RERA (30-Day Success)"
              value={getRate(stats.last30Days, 'Karnataka')}
              sublabel="Cumulative trailing monthly benchmark"
              variant="neutral"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">

        {/* Action Feedback Banner */}
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
              className="text-text-secondary hover:text-text-primary text-[11px] uppercase tracking-wider font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-card border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 font-mono text-xs text-text-secondary uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-page border border-border px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="">All State Portals</option>
              <option value="Maharashtra">Maharashtra (MahaRERA)</option>
              <option value="Karnataka">Karnataka (K-RERA)</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-page border border-border px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
            </select>
          </div>

          <div className="font-mono text-xs text-text-secondary">
            Showing <span className="text-text-primary font-bold">{jobs.length}</span> recorded ingestion executions
          </div>
        </div>

        {/* Sync Jobs Table */}
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
                    <th className="py-3 px-4">Job ID</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">Project / RERA No.</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Records</th>
                    <th className="py-3 px-4">Execution Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs font-mono">
                  {loading && jobs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-text-secondary uppercase tracking-eyebrow">
                        Polling ingestion ledger...
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-text-secondary">
                        No synchronization jobs matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => {
                      const isExpanded = !!expandedJobs[job.id];
                      const isRetrying = !!retryingJobs[job.id];

                      return (
                        <React.Fragment key={job.id}>
                          <tr className={`hover:bg-page/50 transition-colors ${job.status === 'failed' ? 'bg-[#FFFDFB]' : ''}`}>
                            <td className="py-3.5 px-4 font-bold text-text-primary">
                              #{job.id}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant={job.state === 'Maharashtra' ? 'primary' : 'neutral'}>
                                {job.state}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-sans font-semibold text-text-primary text-sm">
                                {job.project_name || `Project #${job.project_id || '—'}`}
                              </div>
                              <div className="text-text-secondary text-[11px] font-mono">
                                {job.rera_number || 'Global Sync'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {job.status === 'success' && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-primary-bg border border-accent-primary/40 text-accent-primary text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Success</span>
                                </span>
                              )}
                              {job.status === 'failed' && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-warning-bg border border-accent-warning/40 text-accent-warning text-[11px] font-bold">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Failed (x{job.retry_count || 0})</span>
                                </span>
                              )}
                              {job.status === 'running' && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-card border border-border text-text-primary text-[11px]">
                                  <Clock className="w-3 h-3 animate-spin text-accent-primary" />
                                  <span>Running</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-text-primary">
                              {job.records_synced ?? 0}
                            </td>
                            <td className="py-3.5 px-4 text-text-secondary">
                              <div>{formatDate(job.started_at || job.created_at)}</div>
                              {job.completed_at && (
                                <div className="text-[10px] text-text-secondary/80">
                                  Done: {formatDate(job.completed_at)}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              {job.error_log && (
                                <button
                                  onClick={() => toggleExpand(job.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] border border-border hover:bg-page transition-colors text-text-secondary"
                                  title="View error diagnostic output"
                                >
                                  <span>Log</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}

                              {job.project_id && (
                                <button
                                  onClick={() => handleRetry(job.id)}
                                  disabled={isRetrying || job.status === 'running'}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card hover:bg-page border border-border text-text-primary disabled:opacity-50 transition-colors text-[11px]"
                                  title="Manually retry portal synchronization"
                                >
                                  <RotateCcw className={`w-3 h-3 text-accent-primary ${isRetrying ? 'animate-spin' : ''}`} />
                                  <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expandable Diagnostic Log Drawer */}
                          {isExpanded && job.error_log && (
                            <tr className="bg-page border-b border-border">
                              <td colSpan="7" className="p-4">
                                <div className="bg-[#1C201D] text-[#E5E9E0] p-4 text-[11px] font-mono border border-border/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                  <div className="text-[#889087] mb-2 border-b border-[#2C332D] pb-1 uppercase tracking-wider">
                                    Diagnostic Trace Log • Job #{job.id} • Retried {job.retry_count || 0} times
                                  </div>
                                  {job.error_log}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
