import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyebrowLabel } from './EyebrowLabel';
import { Badge } from './Badge';
import { Search, ArrowRight, ArrowLeft, Check, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { gsap, prefersReducedMotion } from '../utils/motion';

export const AddCaseModal = ({ isOpen, onClose, onCaseCreated }) => {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  // Step 1: Project search / manual entry; Step 2: Buyer agreement facts
  const [step, setStep] = useState(1);
  const stepContainerRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Manual Project Form state (if not found in search)
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualProject, setManualProject] = useState({
    rera_number: '',
    state: 'Maharashtra',
    name: '',
    developer_name: '',
    registered_possession_date: '',
  });

  // Step 2: Buyer Case Facts
  const [caseFacts, setCaseFacts] = useState({
    promised_date_from_agreement: '',
    amount_paid: '',
    chosen_remedy: 'DELAY_INTEREST',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Animate step transitions using GSAP
  useEffect(() => {
    if (!stepContainerRef.current) return;
    if (prefersReducedMotion()) {
      gsap.set(stepContainerRef.current, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      stepContainerRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
    );
  }, [step, showManualForm]);

  // Handle Project Search (hits GET /api/projects?search=)
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');
    try {
      const res = await authFetch(`/api/projects?search=${encodeURIComponent(searchQuery.trim())}`);
      const json = await res.json();
      if (res.ok) {
        setSearchResults(json.data || []);
        setSearchExecuted(true);
        if ((json.data || []).length === 0) {
          setShowManualForm(true);
          // Pre-populate RERA or name into manual form if applicable
          if (searchQuery.toUpperCase().includes('RERA') || searchQuery.length > 5) {
            setManualProject(prev => ({ ...prev, rera_number: searchQuery.trim().toUpperCase() }));
          } else {
            setManualProject(prev => ({ ...prev, name: searchQuery.trim() }));
          }
        } else {
          setShowManualForm(false);
        }
      } else {
        setError(json.error || 'Failed to search projects catalog');
      }
    } catch (err) {
      console.error(err);
      setError('Network error searching projects database');
    } finally {
      setSearching(false);
    }
  };

  // Select existing project from search
  const handleSelectExisting = (proj) => {
    setSelectedProject(proj);
    // Pre-fill promised date with registered date as reference
    setCaseFacts(prev => ({
      ...prev,
      promised_date_from_agreement: proj.registered_possession_date ? proj.registered_possession_date.substring(0, 10) : '',
    }));
    setStep(2);
  };

  // Proceed to Step 2 with manual project facts
  const handleConfirmManualProject = (e) => {
    e.preventDefault();
    if (!manualProject.rera_number.trim() || !manualProject.name.trim() || !manualProject.developer_name.trim() || !manualProject.registered_possession_date) {
      setError('Please fill in all project fields.');
      return;
    }

    setSelectedProject({
      ...manualProject,
      isManual: true,
    });
    setCaseFacts(prev => ({
      ...prev,
      promised_date_from_agreement: manualProject.registered_possession_date,
    }));
    setStep(2);
  };

  // Final submit: creates project (if manual) + creates case
  const handleSubmitCase = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let finalProjectId = selectedProject?.id;

      // If manual project, save it first (or get existing duplicate)
      if (selectedProject?.isManual || !finalProjectId) {
        const projRes = await authFetch('/api/projects', {
          method: 'POST',
          body: JSON.stringify({
            rera_number: selectedProject.rera_number.trim(),
            state: selectedProject.state,
            name: selectedProject.name.trim(),
            developer_name: selectedProject.developer_name.trim(),
            registered_possession_date: selectedProject.registered_possession_date,
          }),
        });

        const projJson = await projRes.json();
        if (!projRes.ok) {
          throw new Error(projJson.error || 'Failed to record project');
        }
        finalProjectId = projJson.data.id;
      }

      // Now create buyer case linking user to this project
      const caseRes = await authFetch('/api/cases', {
        method: 'POST',
        body: JSON.stringify({
          project_id: finalProjectId,
          promised_date_from_agreement: caseFacts.promised_date_from_agreement,
          amount_paid: parseFloat(caseFacts.amount_paid) || 0,
          chosen_remedy: caseFacts.chosen_remedy,
        }),
      });

      const caseJson = await caseRes.json();
      if (!caseRes.ok) {
        throw new Error(caseJson.error || 'Failed to initialize buyer case');
      }

      // Successful creation: invoke callback or navigate to case detail
      if (onCaseCreated) {
        onCaseCreated(caseJson.data);
      }
      onClose();
      navigate(`/cases/${caseJson.data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error creating case record.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setSearchQuery('');
    setSearchResults([]);
    setSearchExecuted(false);
    setSelectedProject(null);
    setShowManualForm(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl p-6 sm:p-8 my-8">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
          <div className="flex items-center gap-2.5">
            <EyebrowLabel variant="primary" text={`PHASE 2 DOSSIER SETUP • STEP 0${step} OF 02`} />
          </div>
          <button
            onClick={resetAndClose}
            className="text-text-secondary hover:text-text-primary p-1 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-accent-warning-bg border border-accent-warning/40 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-warning shrink-0 mt-0.5" />
            <div className="text-sm text-accent-warning">{error}</div>
          </div>
        )}

        <div ref={stepContainerRef}>
          {/* =================================================================== */}
          {/* STEP 1: SEARCH-FIRST OR MANUAL ENTRY                                */}
          {/* =================================================================== */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                  Identify Your Real Estate Project
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Search by project name or State RERA registration number to link to an existing verified file, or record a new project manually.
                </p>
              </div>

              {/* Search-first input bar */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by RERA No. (e.g. P51800001234) or project name..."
                    className="w-full px-3.5 py-2.5 bg-page border border-border text-sm font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary rounded-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="px-5 py-2.5 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-sm font-medium border border-accent-primary flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span>{searching ? 'Auditing...' : 'Lookup'}</span>
                </button>
              </form>

              {/* Search Results Preview Cards */}
              {searchExecuted && searchResults.length > 0 && !showManualForm && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
                    <span>MATCHING REGISTERED PROJECTS ({searchResults.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowManualForm(true)}
                      className="text-accent-primary hover:underline"
                    >
                      Not listed? Add manually &rarr;
                    </button>
                  </div>

                  {searchResults.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 bg-page border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-text-primary text-base">
                            {proj.name}
                          </span>
                          <Badge variant="primary">{proj.state}</Badge>
                        </div>
                        <div className="font-mono text-xs text-text-secondary">
                          RERA ID: <span className="text-text-primary font-semibold">{proj.rera_number}</span>
                        </div>
                        <div className="text-xs text-text-secondary">
                          Promoter: <span className="text-text-primary">{proj.developer_name}</span>
                        </div>
                        <div className="text-xs text-text-secondary font-mono">
                          Registered Possession: <span className="text-text-primary">{proj.registered_possession_date ? proj.registered_possession_date.substring(0, 10) : 'Not Specified'}</span>
                          <span className="text-[10px] text-text-secondary ml-2 italic">(as recorded in system)</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectExisting(proj)}
                        className="self-start sm:self-center px-4 py-2 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-xs font-medium border border-accent-primary flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>This Is My Project</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Entry Fallback Form */}
              {(showManualForm || (searchExecuted && searchResults.length === 0)) && (
                <form onSubmit={handleConfirmManualProject} className="p-5 bg-page border border-border space-y-4">
                  <div className="flex items-start gap-2.5 p-3 bg-card border border-border text-xs text-text-secondary">
                    <ShieldAlert className="w-4 h-4 text-accent-warning shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-text-primary font-medium block mb-0.5">
                        Self-Reported / Unverified Entry
                      </strong>
                      This project is not yet in our pre-indexed directory. Enter the facts from your Agreement for Sale. In Phase 3, this record will be verified against the state RERA portal.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-eyebrow text-text-primary font-semibold mb-1">
                        State RERA Jurisdiction *
                      </label>
                      <select
                        value={manualProject.state}
                        onChange={(e) => setManualProject({ ...manualProject, state: e.target.value })}
                        className="w-full px-3 py-2 bg-card border border-border text-sm text-text-primary font-sans focus:outline-none focus:border-accent-primary rounded-none"
                      >
                        <option value="Maharashtra">Maharashtra (MahaRERA)</option>
                        <option value="Karnataka">Karnataka (K-RERA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-eyebrow text-text-primary font-semibold mb-1">
                        RERA Registration Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualProject.rera_number}
                        onChange={(e) => setManualProject({ ...manualProject, rera_number: e.target.value })}
                        placeholder="e.g. P51800001234"
                        className="w-full px-3 py-2 bg-card border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-eyebrow text-text-primary font-semibold mb-1">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualProject.name}
                        onChange={(e) => setManualProject({ ...manualProject, name: e.target.value })}
                        placeholder="e.g. Sunrise Heights Phase II"
                        className="w-full px-3 py-2 bg-card border border-border text-sm text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-eyebrow text-text-primary font-semibold mb-1">
                        Developer / Promoter Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualProject.developer_name}
                        onChange={(e) => setManualProject({ ...manualProject, developer_name: e.target.value })}
                        placeholder="e.g. Apex Realty Ventures Ltd."
                        className="w-full px-3 py-2 bg-card border border-border text-sm text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-mono text-[11px] uppercase tracking-eyebrow text-text-primary font-semibold mb-1">
                        Registered Completion / Possession Target *
                      </label>
                      <input
                        type="date"
                        required
                        value={manualProject.registered_possession_date}
                        onChange={(e) => setManualProject({ ...manualProject, registered_possession_date: e.target.value })}
                        className="w-full px-3 py-2 bg-card border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                      />
                      <span className="text-[11px] text-text-secondary mt-1 block">
                        The date disclosed by the promoter on the official RERA filing.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    {searchExecuted && searchResults.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setShowManualForm(false)}
                        className="text-xs text-text-secondary hover:text-text-primary font-mono"
                      >
                        &larr; Back to search results
                      </button>
                    ) : <div />}

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-xs font-semibold border border-accent-primary flex items-center gap-1.5 transition-colors"
                    >
                      <span>Proceed to Agreement Facts</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Toggle to manual if not searched yet */}
              {!searchExecuted && !showManualForm && (
                <div className="text-center pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(true)}
                    className="text-xs font-mono text-text-secondary hover:text-accent-primary transition-colors"
                  >
                    Don't have RERA search details handy? Enter project manually &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 2: BUYER AGREEMENT FACTS & INITIAL DISBURSEMENT                */}
          {/* =================================================================== */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                  Enter Your Agreement Terms
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Provide the agreed possession date specified in your registered Agreement for Sale and your total payment tally.
                </p>
              </div>

              {/* Selected Project Summary Pill */}
              <div className="p-4 bg-page border border-border mb-6 flex items-center justify-between">
                <div>
                  <span className="font-serif font-bold text-text-primary block">
                    {selectedProject?.name}
                  </span>
                  <span className="font-mono text-xs text-text-secondary">
                    {selectedProject?.rera_number} • {selectedProject?.state}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-mono text-accent-primary hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>

              <form onSubmit={handleSubmitCase} className="space-y-5">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold mb-1">
                    Promised Possession Date (From Agreement) *
                  </label>
                  <input
                    type="date"
                    required
                    value={caseFacts.promised_date_from_agreement}
                    onChange={(e) => setCaseFacts({ ...caseFacts, promised_date_from_agreement: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-page border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                  />
                  <span className="text-[11px] text-text-secondary mt-1 block">
                    Often differs from the developer's registered date on the RERA portal. RERA Section 18 enforces the date agreed in your registered agreement.
                  </span>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold mb-1">
                    Total Amount Paid to Date (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-mono text-text-secondary text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="e.g. 4500000"
                      value={caseFacts.amount_paid}
                      onChange={(e) => setCaseFacts({ ...caseFacts, amount_paid: e.target.value })}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-page border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                    />
                  </div>
                  <span className="text-[11px] text-text-secondary mt-1 block">
                    You can log detailed installment breakdown dates on the case payment ledger next.
                  </span>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold mb-1">
                    Statutory Remedy Preference (Section 18)
                  </label>
                  <select
                    value={caseFacts.chosen_remedy}
                    onChange={(e) => setCaseFacts({ ...caseFacts, chosen_remedy: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-page border border-border text-sm font-sans text-text-primary focus:outline-none focus:border-accent-primary rounded-none"
                  >
                    <option value="DELAY_INTEREST">
                      Option A: Stay in project & claim monthly delayed interest (SBI MCLR + 2%)
                    </option>
                    <option value="REFUND">
                      Option B: Withdraw from project & seek 100% refund with interest
                    </option>
                    <option value="UNDECIDED">
                      Undecided (Evaluate remedies during adjudication review)
                    </option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-mono text-text-secondary hover:text-text-primary flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-sm font-semibold border border-accent-primary flex items-center gap-2 disabled:opacity-60 transition-colors"
                  >
                    <span>{submitting ? 'Generating Dossier...' : 'Create Case File'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
