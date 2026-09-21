import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full bg-page border-t border-border">
      {/* Top Hairline Row: Civic authority disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-border">
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent-primary text-[#F7F2E9] flex items-center justify-center rounded-none">
                <Shield className="w-4 h-4 text-[#F7F2E9]" />
              </div>
              <span className="font-serif text-lg font-bold text-text-primary">
                BuyerShield
              </span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed max-w-md">
              A civic technology platform empowering under-construction home buyers across India to track regulatory filings, calculate statutory possession delay compensation, and navigate Section 18 of the Real Estate (Regulation and Development) Act, 2016.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-eyebrow text-text-primary font-bold mb-4">
              Statutory Basis
            </h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li>
                <span className="hover:text-accent-primary">Section 18(1) Delay Compensation</span>
              </li>
              <li>
                <span className="hover:text-accent-primary">MahaRERA Order Precedents</span>
              </li>
              <li>
                <span className="hover:text-accent-primary">Karnataka RERA (K-RERA)</span>
              </li>
              <li>
                <span className="hover:text-accent-primary">Delhi / UP RERA Guidelines</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-eyebrow text-text-primary font-bold mb-4">
              Resources & Registry
            </h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li className="flex items-center gap-1.5">
                <a 
                  href="https://rera.mohua.gov.in" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-accent-primary flex items-center gap-1"
                >
                  <span>National RERA Portal</span>
                  <ExternalLink className="w-3 h-3 text-text-secondary" />
                </a>
              </li>
              <li>
                <span className="hover:text-accent-primary">Standard Agreement Verification</span>
              </li>
              <li>
                <span className="hover:text-accent-primary">SBI MCLR + 2% Rate Schedule</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Hairline Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-secondary">
          <p className="font-mono">
            © {new Date().getFullYear()} BuyerShield. Built for home buyer protection in India.
          </p>
          <p className="max-w-xl text-center sm:text-right">
            Disclaimer: BuyerShield provides statutory analysis and research tools under RERA 2016. It does not constitute formal advocate representation before the Real Estate Appellate Tribunal.
          </p>
        </div>
      </div>
    </footer>
  );
};
