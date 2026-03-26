import React from 'react';
import { XCircle, Check, Zap } from 'lucide-react';

const Toast = ({ message, type, onClose }) => (
  <div className={`fixed bottom-8 right-8 z-[100] p-4 rounded-xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-10 duration-300 ${
    type === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-google-blue/10 border-google-blue text-google-blue'
  }`}>
    <div className={`p-2 rounded-full ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-google-blue text-white'}`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
    </div>
    <span className="font-bold text-sm tracking-tight">{message}</span>
    <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100"><XCircle className="w-4 h-4" /></button>
  </div>
);

export default Toast;
