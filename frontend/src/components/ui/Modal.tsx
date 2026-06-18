import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 fade-in duration-300 overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b border-gray-50">
          <h2 className="text-2xl font-bold text-[#0F3B3C]">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};