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
    <footer className="w-full bg-slate-950 text-slate-400">
      <div className="mx-auto w-full px-3 py-4 sm:px-5 lg:px-8 xl:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-center lg:justify-start">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3E6F]">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">SMART Insurance</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs text-slate-300 sm:gap-4 sm:text-sm lg:justify-start lg:text-left">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Bole Road, Addis Ababa</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-slate-500" />
              <span>+251 11 555 1234</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />
              <span>info@SMARTinsurance.com</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-slate-500 lg:justify-end">
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

      <div className="border-t border-slate-800">
        <div className="mx-auto flex w-full flex-col items-center justify-between gap-2 px-3 py-3 text-[11px] text-slate-400 sm:flex-row sm:px-5 sm:text-xs lg:px-8 xl:px-10">
          <p className="text-center sm:text-left">&copy; {currentYear} SMART Insurance S.C. All rights reserved.</p>
          <div className="flex gap-3 sm:gap-4">
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