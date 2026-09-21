import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyebrowLabel } from '../components/EyebrowLabel';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    setLoading(true);

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <EyebrowLabel variant="primary" text="NEW ALLOTTEE ONBOARDING" className="mb-2" />
          <h2 className="font-serif text-3xl font-bold tracking-tight text-text-primary">
            Create BuyerShield Account
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-accent-primary hover:underline"
            >
              Sign in here
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="name"
                className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold mb-2"
              >
                Allottee Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajesh K. Nair"
                className="block w-full px-3.5 py-2.5 bg-page border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary text-sm font-sans rounded-none"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="allottee@domain.com"
                className="block w-full px-3.5 py-2.5 bg-page border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary text-sm font-mono rounded-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold mb-2"
              >
                Password (min 6 characters)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3.5 py-2.5 bg-page border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary text-sm font-mono rounded-none"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block font-mono text-xs uppercase tracking-eyebrow text-text-primary font-semibold mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3.5 py-2.5 bg-page border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary text-sm font-mono rounded-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-accent-primary text-sm font-medium rounded-none text-[#F7F2E9] bg-accent-primary hover:bg-[#162D20] focus:outline-none disabled:opacity-60 transition-colors"
              >
                {loading ? 'Registering...' : 'Complete Registration'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <span className="text-xs text-text-secondary">
              Statutory advisory platform for home buyers. Encrypted session.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
