import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, LayoutDashboard, ChevronRight, Activity, Scale } from 'lucide-react';

export const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header id="site-navbar" className="sticky top-0 z-50 w-full bg-page/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand: Square solid accent-primary logo + Serif wordmark + small-caps subtitle */}
          <Link to="/" className="flex items-center gap-3.5 group">
            {/* Square (not rounded) logo mark in solid accent-primary */}
            <div className="w-10 h-10 bg-accent-primary text-[#F7F2E9] flex items-center justify-center rounded-none transition-colors duration-150 ease group-hover:bg-[#162D20]">
              <Shield className="w-5 h-5 text-[#F7F2E9]" strokeWidth={2.2} />
            </div>
            
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-text-primary leading-none">
                BuyerShield
              </span>
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-text-secondary mt-1 font-semibold">
                RERA Section 18 Advisory
              </span>
            </div>
          </Link>

          {/* Nav links in sans */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <a
              href="#workflow"
              className="hover:text-accent-primary transition-colors cursor-pointer"
            >
              Statutory Process
            </a>
            <a
              href="#provisions"
              className="hover:text-accent-primary transition-colors cursor-pointer"
            >
              Section 18 Rights
            </a>
            <a
              href="#faq"
              className="hover:text-accent-primary transition-colors cursor-pointer"
            >
              RERA Precedents
            </a>
          </nav>

          {/* Right actions: Plain text Sign in + Solid accent-primary rectangular CTA button */}
          <div className="flex items-center gap-5">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 text-sm font-medium text-text-primary hover:text-accent-primary transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Case Workspace</span>
                </Link>

                {user?.role === 'admin' && (
                  <>
                    <Link
                      to="/admin/sync"
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-card border border-border text-xs font-mono uppercase tracking-wider text-accent-primary hover:bg-page transition-colors"
                      title="RERA Ingestion Telemetry & Manual Sync"
                    >
                      <Activity className="w-3.5 h-3.5 text-accent-primary" />
                      <span className="hidden md:inline">Sync</span>
                    </Link>

                    <Link
                      to="/admin/interest-rates"
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-card border border-border text-xs font-mono uppercase tracking-wider text-accent-primary hover:bg-page transition-colors"
                      title="State RERA Section 18 Interest Rate Policies"
                    >
                      <Scale className="w-3.5 h-3.5 text-accent-primary" />
                      <span className="hidden md:inline">Rates</span>
                    </Link>
                  </>
                )}
                
                <span className="text-border hidden sm:inline">|</span>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-accent-warning transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <Link
                  to="/login"
                  className="text-sm font-medium text-text-primary hover:text-accent-primary transition-colors py-2"
                >
                  Sign in
                </Link>

                {/* Solid accent-primary rectangular CTA button (sharp corners, no shadow) */}
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-[#162D20] text-[#F7F2E9] text-sm font-medium rounded-none border border-accent-primary transition-colors"
                >
                  <span>Track Your Project</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
