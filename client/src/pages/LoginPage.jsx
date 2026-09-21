import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyebrowLabel } from '../components/EyebrowLabel';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('test@example.com');
    setPassword('password123');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-grid-pattern flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Brand Mark */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-accent-primary text-[#F7F2E9] flex items-center justify-center rounded-none border border-accent-primary">
            <Shield className="w-6 h-6 text-[#F7F2E9]" strokeWidth={2.2} />
          </div>
        </div>

        <div className="text-center">
          <EyebrowLabel variant="primary" text="SECURE CASE ACCESS" className="mb-2" />
          <h2 className="font-serif text-3xl font-bold tracking-tight text-text-primary">
            Sign in to BuyerShield
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-accent-primary hover:underline"
            >
              register a new buyer account
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-6 sm:px-10 border border-border">
          
          {error && (
            <div className="mb-6 p-4 bg-accent-warning-bg border border-accent-warning/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent-warning shrink-0 mt-0.5" />
              <div className="text-sm text-accent-warning">
                {error}
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold mb-2"
              >
                Registered Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="block w-full px-3.5 py-2.5 bg-page border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary text-sm font-mono rounded-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold"
                >
                  Password
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3.5 py-2.5 bg-page border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary text-sm font-mono rounded-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-accent-primary text-sm font-medium rounded-none text-[#F7F2E9] bg-accent-primary hover:bg-[#162D20] focus:outline-none disabled:opacity-60 transition-colors"
              >
                {loading ? 'Verifying...' : 'Authenticate & Open Workspace'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Quick Demo Pre-fill */}
          <div className="mt-6 pt-6 border-t border-border/80">
            <button
              type="button"
              onClick={handleDemoFill}
              className="w-full text-left p-3 bg-page hover:bg-[#EFE9DC] border border-border transition-colors text-xs font-mono text-text-secondary flex items-center justify-between"
            >
              <span>Pre-fill test account (test@example.com)</span>
              <span className="text-accent-primary font-semibold">Click to load</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
