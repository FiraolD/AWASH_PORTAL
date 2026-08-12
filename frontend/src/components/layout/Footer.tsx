import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Phone, Mail, MapPin, Clock, ChevronRight,
  Send, ArrowUp, Heart, Award, HeadphonesIcon, Building2, Globe,
  // Social media icons use these names in Lucide:
  MessageCircle,      
  MessageSquare,       
 Globe2,       
  Camera,            
  Play,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Separator } from '../ui/Separator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface QuickLink {
  label: string;
  href: string;
}

interface ContactInfo {
  icon: React.ReactNode;
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const productLinks: QuickLink[] = [
  { label: 'Motor Insurance', href: '/products/motor' },
  { label: 'Health Insurance', href: '/products/health' },
  { label: 'Fire Insurance', href: '/products/fire' },
  { label: 'Travel Insurance', href: '/products/travel' },
  { label: 'Life Insurance', href: '/products/life' },
  { label: 'Marine Insurance', href: '/products/marine' },
];

const quickLinks: QuickLink[] = [
  { label: 'Get a Quote', href: '/get-quote' },
  { label: 'File a Claim', href: '/customer/claims/new' },
  { label: 'Pay Premium', href: '/payments' },
  { label: 'Find an Agent', href: '/agents' },
  { label: 'Support Center', href: '/support' },
  { label: 'FAQs', href: '/faqs' },
];

const companyLinks: QuickLink[] = [
  { label: 'About Us', href: '/about' },
  { label: 'Careers', href: '/careers' },
  { label: 'News & Media', href: '/news' },
  { label: 'Investor Relations', href: '/investors' },
  { label: 'CSR Initiatives', href: '/csr' },
  { label: 'Contact Us', href: '/contact' },
];

const legalLinks: QuickLink[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'Regulatory Disclosures', href: '/regulatory' },
];

const contactInfo: ContactInfo[] = [
  {
    icon: <MapPin className="h-5 w-5" />,
    label: 'Head Office',
    value: 'Bole Road, Awash Towers, Addis Ababa, Ethiopia',
  },
  {
    icon: <Phone className="h-5 w-5" />,
    label: 'Phone',
    value: '+251 11 555 1234',
  },
  {
    icon: <Mail className="h-5 w-5" />,
    label: 'Email',
    value: 'info@awashinsurance.com',
  },
  {
    icon: <Clock className="h-5 w-5" />,
    label: 'Working Hours',
    value: 'Mon - Fri: 8:00 AM - 5:00 PM',
  },
];

const socialLinks = [
  { icon: <MessageCircle className="h-5 w-5" />, href: '#', label: 'Facebook' },
  { icon: <MessageSquare className="h-5 w-5" />, href: '#', label: 'Twitter' },
  { icon: <Globe2 className="h-5 w-5" />, href: '#', label: 'LinkedIn' },
  { icon: <Camera className="h-5 w-5" />, href: '#', label: 'Instagram' },
  { icon: <Play className="h-5 w-5" />, href: '#', label: 'YouTube' },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Show/hide scroll-to-top button
  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="relative bg-gradient-to-b from-gray-900 to-gray-950 text-gray-300">
      {/* ================================================================ */}
      {/* NEWSLETTER SECTION */}
      {/* ================================================================ */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-1">
                Stay Informed
              </h3>
              <p className="text-gray-400 text-sm">
                Subscribe to our newsletter for insurance tips, product updates, and exclusive offers.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
              <div className="relative flex-1 md:w-80">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-[#1A3E6F] focus:ring-[#1A3E6F] h-11"
                />
              </div>
              <Button
                type="submit"
                className="bg-[#1A3E6F] hover:bg-[#153358] text-white h-11 px-6 transition-all duration-200 hover:scale-105"
              >
                {subscribed ? (
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4 fill-current" /> Subscribed!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" /> Subscribe
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MAIN FOOTER CONTENT */}
      {/* ================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Column 1: About */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="h-10 w-10 bg-[#1A3E6F] rounded-lg flex items-center justify-center group-hover:bg-[#153358] transition-colors">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">
                  Awash Insurance
                </h2>
                <p className="text-xs text-gray-400 -mt-1">Protecting What Matters</p>
              </div>
            </Link>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Awash Insurance S.C. is one of Ethiopia's leading insurance companies, 
              providing comprehensive insurance solutions since 1994. We are committed 
              to protecting your assets, health, and future with innovative and reliable 
              insurance products.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 bg-gray-800 rounded-full px-3 py-1.5 text-xs">
                <Award className="h-3.5 w-3.5 text-yellow-500" />
                NBE Licensed
              </span>
              <span className="inline-flex items-center gap-1.5 bg-gray-800 rounded-full px-3 py-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                30+ Years Experience
              </span>
              <span className="inline-flex items-center gap-1.5 bg-gray-800 rounded-full px-3 py-1.5 text-xs">
                <HeadphonesIcon className="h-3.5 w-3.5 text-green-400" />
                24/7 Support
              </span>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              {contactInfo.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 group cursor-default">
                  <div className="mt-0.5 text-gray-500 group-hover:text-[#1A3E6F] transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm text-gray-300">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Products */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Our Products
            </h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1 group"
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1 group"
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Company links */}
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mt-6 mb-4">
              Company
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1 group"
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1 group"
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Social Links */}
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mt-6 mb-4">
              Follow Us
            </h3>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="h-9 w-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-[#1A3E6F] hover:text-white transition-all duration-200 hover:scale-110"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* BOTTOM BAR */}
      {/* ================================================================ */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} Awash Insurance S.C. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Ethiopia</span>
              <span className="text-gray-700">|</span>
              <span>ETB</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* SCROLL TO TOP BUTTON */}
      {/* ================================================================ */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-[#1A3E6F] text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-[#153358] hover:scale-110 ${
          showScrollTop
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
};

export default Footer;