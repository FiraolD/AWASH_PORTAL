import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Phone, MapPin, ArrowUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const currentYear = new Date().getFullYear();

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3E6F]">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">SMART Insurance</span>
            </Link>
            <p className="mb-4 text-sm leading-relaxed text-slate-300">
              Protecting what matters since 1994.
            </p>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 text-slate-500" />
                <span>Bole Road, Addis Ababa</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-slate-500" />
                <span>+251 11 555 1234</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-slate-500" />
                <span>info@SMARTinsurance.com</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">Products</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/products/motor" className="transition-colors hover:text-white">Motor Insurance</Link></li>
              <li><Link to="/products/health" className="transition-colors hover:text-white">Health Insurance</Link></li>
              <li><Link to="/products/fire" className="transition-colors hover:text-white">Fire Insurance</Link></li>
              <li><Link to="/products/travel" className="transition-colors hover:text-white">Travel Insurance</Link></li>
              <li><Link to="/products/life" className="transition-colors hover:text-white">Life Insurance</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/customer/claims/new" className="transition-colors hover:text-white">File a Claim</Link></li>
              <li><Link to="/customer/policies/new" className="transition-colors hover:text-white">Get a Quote</Link></li>
              <li><Link to="/support/new" className="transition-colors hover:text-white">Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">Stay Updated</h4>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 flex-1 border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />
              <Button type="submit" size="sm" className="h-9 bg-[#1A3E6F] px-3 text-xs hover:bg-[#153358]">
                {subscribed ? '✓' : 'Send'}
              </Button>
            </form>
            <div className="mt-4 flex gap-3 text-slate-500">
              <a href="#" className="transition-colors hover:text-white" aria-label="Facebook">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="transition-colors hover:text-white" aria-label="Twitter">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.linkedin.com/in/firaoldelesa" className="transition-colors hover:text-white" aria-label="LinkedIn">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8 xl:px-10">
          <p>&copy; {currentYear} SMART Insurance S.C. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-white">Terms</Link>
            <Link to="/cookies" className="transition-colors hover:text-white">Cookies</Link>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-[#1A3E6F] text-white shadow-lg transition-all duration-300 hover:bg-[#153358] ${
          showScrollTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </footer>
  );
};

export default Footer;