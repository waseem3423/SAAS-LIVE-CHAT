'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Product { id: string; name: string; price: string; description: string; features: string; variants: string; }
interface FAQ { id: string; question: string; answer: string; }
interface ConvExample { id: string; customer: string; ai: string; }
interface BusinessKnowledge {
  company: { about: string; mission_vision: string; owner: string; };
  products: Product[];
  faqs: FAQ[];
  policies: { refund: string; shipping: string; return_policy: string; };
  business_hours: Record<string, { open: boolean; hours: string; }>;
  contact: { phone: string; whatsapp: string; email: string; address: string; };
  business_rules: string;
  conversation_examples: ConvExample[];
  ai_instructions: string;
}
interface Business { id: string; name: string; widget_domain_whitelist: string; ai_context: string | null; }

interface ValidationItem {
  type: string;
  field: string;
  message: string;
  suggestion: string | null;
}

interface ValidationReport {
  score: number;
  warnings: ValidationItem[];
  errors: ValidationItem[];
  suggestions: ValidationItem[];
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const uid = () => Math.random().toString(36).slice(2, 9);
const defaultKB = (): BusinessKnowledge => ({
  company: { about: '', mission_vision: '', owner: '' },
  products: [],
  faqs: [],
  policies: { refund: '', shipping: '', return_policy: '' },
  business_hours: Object.fromEntries(DAYS.map(d => [d, { open: true, hours: '9:00 AM - 6:00 PM' }])),
  contact: { phone: '', whatsapp: '', email: '', address: '' },
  business_rules: '',
  conversation_examples: [],
  ai_instructions: '',
});

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const Ic = {
  company: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 0 1 0-1.5h12.5a.75.75 0 0 1 0 1.5H16v13h.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1 0-1.5H4Zm3-11a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm.5 3.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Zm2.5-4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm.5 3.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Z" clipRule="evenodd" /></svg>,
  product: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.5 3A2.5 2.5 0 0 0 3 5.5v2.879a2.5 2.5 0 0 0 .732 1.767l6.5 6.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-6.5-6.5A2.5 2.5 0 0 0 8.38 3H5.5ZM6 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" /></svg>,
  faq: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" /></svg>,
  policy: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>,
  clock: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" /></svg>,
  phone: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" /></svg>,
  rules: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 15.25a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 10a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1V10Z" clipRule="evenodd" /></svg>,
  chat: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 0 0-.577-.069 43.141 43.141 0 0 0-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 0 1 5 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914Z" /><path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.141 2.841 2.695 2.95.591.041 1.19.063 1.805.063h.5l3.45 3.451a.75.75 0 0 0 1.28-.531v-3.26l.209-.035C20.032 13.256 21 12.112 21 10.72V8.998c0-1.526-1.157-2.85-2.729-2.936A41.645 41.645 0 0 0 14 6Z" /></svg>,
  robot: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M16.5 7.5h-9v9h9v-9Z" /><path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z" clipRule="evenodd" /></svg>,
  plus: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>,
  trash: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>,
  save: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>,
  wand: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM17.98 12.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM5.98 3.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785L1.804 6.02a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM2.05 17.95a1 1 0 0 1 0-1.414l9.9-9.9a1 1 0 1 1 1.414 1.414l-9.9 9.9a1 1 0 0 1-1.414 0Z" />
    </svg>
  ),
};

// ─── Reusable UI ─────────────────────────────────────────────────────────────
const Label = ({ text, hint }: { text: string; hint?: string }) => (
  <div className="mb-1.5">
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">{text}</label>
    {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
  </div>
);
const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all";
const Input = ({ label, value, onChange, placeholder, hint, id }: any) => (
  <div id={id}>
    <Label text={label} hint={hint} />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
  </div>
);
const Textarea = ({ label, value, onChange, placeholder, rows = 4, hint, id }: any) => (
  <div id={id}>
    <Label text={label} hint={hint} />
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`${inputCls} resize-y`} />
  </div>
);
const Toggle = ({ checked, onChange }: any) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-indigo-500' : 'bg-slate-200'}`}>
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

// Card with header icon, title, subtitle
const Card = ({ icon, title, subtitle, children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ${className}`}>
    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/80">
      <span className="text-indigo-600">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="p-5 flex-1 space-y-4">{children}</div>
  </div>
);

const AddBtn = ({ onClick, label }: any) => (
  <button onClick={onClick}
    className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5">
    {Ic.plus} {label}
  </button>
);
const RemoveBtn = ({ onClick }: any) => (
  <button onClick={onClick} className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-50">{Ic.trash}</button>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AITrainingPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [kb, setKb] = useState<BusinessKnowledge>(defaultKB());
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [msg, setMsg] = useState('');
  
  // Validation report state
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [ignoredFields, setIgnoredFields] = useState<string[]>([]);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  // Document Knowledge states
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  };

  useEffect(() => {
    apiFetch<Business>('/businesses/me').then(data => {
      setBusiness(data);
      if (data.ai_context) {
        try { 
          const parsed = JSON.parse(data.ai_context);
          setKb({ ...defaultKB(), ...parsed }); 
        } catch {}
      }
    });

    // Load uploaded business documents
    apiFetch<any[]>('/businesses/me/documents').then(docs => {
      setDocuments(docs);
    });
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setMsg('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = getCookie('access_token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      
      const response = await fetch(`${apiBase}/businesses/me/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
      
      const newDoc = await response.json();
      setDocuments(prev => [...prev, newDoc]);
      setMsg('Document uploaded and parsed successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      setMsg(`Error uploading: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await apiFetch(`/businesses/me/documents/${docId}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setMsg('Document deleted successfully!');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) {
      setMsg(`Error deleting: ${e.message}`);
    }
  };

  const upd = useCallback(<K extends keyof BusinessKnowledge>(k: K, v: BusinessKnowledge[K]) =>
    setKb(prev => ({ ...prev, [k]: v })), []);

  const runValidation = async (contextData: BusinessKnowledge) => {
    setIsScanning(true);
    try {
      const res = await apiFetch<ValidationReport>('/businesses/me/validate', {
        method: 'POST',
        body: JSON.stringify(contextData)
      });
      setReport(res);
    } catch (err) {
      console.error("Failed to run validation checks", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Run validation on load once kb finishes loading
  useEffect(() => {
    if (business && kb.company.about) {
      runValidation(kb);
    }
  }, [business]);

  const handleSave = async () => {
    setIsSaving(true); setMsg('');
    try {
      const updated = await apiFetch<any>('/businesses/me', {
        method: 'PUT',
        body: JSON.stringify({ ai_context: JSON.stringify(kb) }),
      });
      setBusiness(updated);
      if (updated.validation_report) {
        setReport(updated.validation_report);
      } else {
        await runValidation(kb);
      }
      setMsg('Saved!');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) { setMsg(`Error: ${e.message}`); }
    finally { setIsSaving(false); }
  };

  // Apply suggestion dot-notation resolver
  const handleApplySuggestion = (fieldPath: string, suggestionText: string) => {
    const parts = fieldPath.split('.');
    setKb(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let current = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const nextPartIsIndex = !isNaN(Number(parts[i + 1]));
        if (nextPartIsIndex) {
          const idx = Number(parts[i + 1]);
          current = current[part][idx];
          i++; // Skip index key iteration
        } else {
          current = current[part];
        }
      }
      const finalKey = parts[parts.length - 1];
      current[finalKey] = suggestionText;
      
      // Auto run validation on the fresh data draft
      setTimeout(() => runValidation(next), 100);
      return next;
    });

    // Briefly flash the element green to indicate apply
    setHighlightedField(fieldPath);
    setTimeout(() => {
      setHighlightedField(null);
      const element = document.getElementById(fieldPath);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  };

  const handleIgnore = (fieldPath: string) => {
    setIgnoredFields(prev => [...prev, fieldPath]);
  };

  if (!business) return (
    <div className="flex h-full items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  // Filter warnings based on ignores
  const activeWarnings = report?.warnings.filter(w => !ignoredFields.includes(w.field)) || [];
  const activeSuggestions = report?.suggestions.filter(s => !ignoredFields.includes(s.field)) || [];

  return (
    <div className="h-full flex overflow-hidden bg-slate-50/50">
      
      {/* ── Left Pane: Knowledge Base Forms ── */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Training</h1>
            <p className="text-slate-500 text-sm mt-0.5">Fill in your business knowledge. AI uses this to answer customer questions.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {msg && <span className={`text-sm font-medium ${msg.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>{msg}</span>}
            <button onClick={handleSave} disabled={isSaving}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-indigo-600/20">
              {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : Ic.save}
              Save Knowledge Base
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Document Knowledge Base (RAG) Card */}
          <Card 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
            } 
            title="Document Knowledge Base (RAG)" 
            subtitle="Upload catalogs, handbooks, or PDF manuals directly. The AI dynamically searches these files to reply." 
            className="col-span-2"
          >
            <div className="grid grid-cols-2 gap-8 items-start">
              {/* Drag and Drop File Input Area */}
              <div className="space-y-4">
                <div 
                  className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all ${
                    isUploading 
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed' 
                      : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!isUploading) {
                      document.getElementById('file-upload-input')?.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    id="file-upload-input"
                    className="hidden"
                    accept=".pdf,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={isUploading}
                  />
                  
                  {isUploading ? (
                    <>
                      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      <div>
                        <p className="text-sm font-bold text-indigo-600">Uploading & Parsing...</p>
                        <p className="text-xs text-slate-400 mt-1">Extracting document pages & training AI</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-sm">
                        📁
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Click to upload catalog file</p>
                        <p className="text-xs text-slate-400 mt-1">Supports PDF or TXT files up to 10MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trained Documents ({documents.length})</span>
                {documents.length === 0 ? (
                  <div className="p-8 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-center text-slate-400">
                    <span className="text-2xl mb-1">📄</span>
                    <p className="text-xs font-semibold">No documents uploaded yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Upload a PDF or TXT file to start local RAG search.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-xl bg-white overflow-hidden shadow-sm">
                    <ul className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto custom-scrollbar">
                      {documents.map((doc) => (
                        <li key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3 overflow-hidden pr-2">
                            <span className="text-xl shrink-0">
                              {doc.filename.endsWith('.pdf') ? '📕' : '📄'}
                            </span>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-slate-700 truncate">{doc.filename}</p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Trained on {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                            className="text-slate-300 hover:text-red-400 p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Delete trained document"
                          >
                            {Ic.trash}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Row 1: Company Info | Contact Info */}
          <Card icon={Ic.company} title="Company Information" subtitle="Background info about your business">
            <Input id="company.owner" label="Owner / Founder" value={kb.company.owner}
              onChange={(v: string) => upd('company', { ...kb.company, owner: v })} placeholder="e.g. Ahmed Khan" />
            <Textarea id="company.about" label="About the Company" value={kb.company.about} rows={4}
              onChange={(v: string) => upd('company', { ...kb.company, about: v })}
              placeholder="We are a premium shoe brand established in 2015. We sell handcrafted leather shoes across Pakistan..." />
            <Textarea id="company.mission_vision" label="Mission & Vision" value={kb.company.mission_vision} rows={2}
              onChange={(v: string) => upd('company', { ...kb.company, mission_vision: v })}
              placeholder="Mission: Affordable quality. Vision: Pakistan's #1 shoe brand." />
          </Card>

          <Card icon={Ic.phone} title="Contact Information" subtitle="AI shares this when customers ask">
            <div className="grid grid-cols-2 gap-3">
              <Input id="contact.phone" label="Phone" value={kb.contact.phone} placeholder="+92 300 1234567"
                onChange={(v: string) => upd('contact', { ...kb.contact, phone: v })} />
              <Input id="contact.whatsapp" label="WhatsApp" value={kb.contact.whatsapp} placeholder="+92 300 1234567"
                onChange={(v: string) => upd('contact', { ...kb.contact, whatsapp: v })} />
            </div>
            <Input id="contact.email" label="Email" value={kb.contact.email} placeholder="support@yourbusiness.com"
              onChange={(v: string) => upd('contact', { ...kb.contact, email: v })} />
            <Input id="contact.address" label="Address" value={kb.contact.address} placeholder="Shop #5, Main Market, Lahore"
              onChange={(v: string) => upd('contact', { ...kb.contact, address: v })} />
          </Card>

          {/* Row 2: Business Hours | Business Rules */}
          <Card icon={Ic.clock} title="Business Hours" subtitle="When you are open">
            <div className="space-y-2">
              {DAYS.map(day => {
                const h = kb.business_hours[day] || { open: true, hours: '9:00 AM - 6:00 PM' };
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600 w-20 shrink-0">{day}</span>
                    <Toggle checked={h.open} onChange={(v: boolean) => upd('business_hours', { ...kb.business_hours, [day]: { ...h, open: v } })} />
                    {h.open
                      ? <input value={h.hours} onChange={e => upd('business_hours', { ...kb.business_hours, [day]: { ...h, hours: e.target.value } })}
                          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
                      : <span className="text-xs text-slate-400 italic">Closed</span>
                    }
                  </div>
                );
              })}
            </div>
          </Card>

          <Card icon={Ic.rules} title="Business Rules" subtitle="Hard rules the AI must always follow">
            <Textarea id="business_rules" label="Rules" value={kb.business_rules} rows={11}
              hint="One rule per line"
              onChange={(v: string) => upd('business_rules', v)}
              placeholder={`- Free shipping on orders above Rs. 5,000\n- COD available only within Pakistan\n- Refund within 7 days only\n- Digital products are non-refundable\n- Minimum order: Rs. 500`} />
          </Card>

          {/* Row 3: Policies */}
          <Card icon={Ic.policy} title="Business Policies" subtitle="Refund, shipping and return — customers ask these constantly" className="col-span-2">
            <div className="grid grid-cols-3 gap-4">
              <Textarea id="policies.refund" label="Refund Policy" value={kb.policies.refund} rows={5}
                onChange={(v: string) => upd('policies', { ...kb.policies, refund: v })}
                placeholder="Full refund within 7 days. No refund on sale items." />
              <Textarea id="policies.shipping" label="Shipping Policy" value={kb.policies.shipping} rows={5}
                onChange={(v: string) => upd('policies', { ...kb.policies, shipping: v })}
                placeholder="Free shipping above Rs. 5,000. Standard: 3-5 days." />
              <Textarea id="policies.return_policy" label="Return & Exchange" value={kb.policies.return_policy} rows={5}
                onChange={(v: string) => upd('policies', { ...kb.policies, return_policy: v })}
                placeholder="Items returnable within 30 days. Original condition required." />
            </div>
          </Card>

          {/* Row 4: Products */}
          <Card icon={Ic.product} title="Products & Services" subtitle="Add products/services — AI uses these to answer pricing, availability, and feature questions" className="col-span-2">
            <div className="space-y-3">
              {kb.products.map((p, i) => (
                <div key={p.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product #{i + 1}</span>
                    <RemoveBtn onClick={() => upd('products', kb.products.filter(x => x.id !== p.id))} />
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <Input id={`products.${i}.name`} label="Name" value={p.name} placeholder="Classic Oxford Shoe"
                        onChange={(v: string) => upd('products', kb.products.map(x => x.id === p.id ? { ...x, name: v } : x))} />
                    </div>
                    <Input id={`products.${i}.price`} label="Price" value={p.price} placeholder="Rs. 8,999"
                      onChange={(v: string) => upd('products', kb.products.map(x => x.id === p.id ? { ...x, price: v } : x))} />
                    <div className="col-span-2">
                      <Input id={`products.${i}.variants`} label="Variants / Colors / Sizes" value={p.variants} placeholder="Black, Brown | Sizes 39–45"
                        onChange={(v: string) => upd('products', kb.products.map(x => x.id === p.id ? { ...x, variants: v } : x))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Textarea id={`products.${i}.description`} label="Description" value={p.description} rows={2} placeholder="Handcrafted genuine leather shoes..."
                      onChange={(v: string) => upd('products', kb.products.map(x => x.id === p.id ? { ...x, description: v } : x))} />
                    <Textarea id={`products.${i}.features`} label="Key Features" value={p.features} rows={2} placeholder="Genuine leather, anti-slip sole..."
                      onChange={(v: string) => upd('products', kb.products.map(x => x.id === p.id ? { ...x, features: v } : x))} />
                  </div>
                </div>
              ))}
              <AddBtn onClick={() => upd('products', [...kb.products, { id: uid(), name: '', price: '', description: '', features: '', variants: '' }])} label="Add Product / Service" />
            </div>
          </Card>

          {/* Row 5: FAQs & Conversation Examples */}
          <Card icon={Ic.faq} title="FAQs" subtitle="Frequently asked questions — AI answers these instantly">
            <div className="space-y-3">
              {kb.faqs.map((faq, i) => (
                <div key={faq.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Q {i + 1}</span>
                    <RemoveBtn onClick={() => upd('faqs', kb.faqs.filter(x => x.id !== faq.id))} />
                  </div>
                  <Input id={`faqs.${i}.question`} label="Question" value={faq.question} placeholder="What is your return policy?"
                    onChange={(v: string) => upd('faqs', kb.faqs.map(x => x.id === faq.id ? { ...x, question: v } : x))} />
                  <Textarea id={`faqs.${i}.answer`} label="Answer" value={faq.answer} rows={2} placeholder="We offer a 30-day return policy..."
                    onChange={(v: string) => upd('faqs', kb.faqs.map(x => x.id === faq.id ? { ...x, answer: v } : x))} />
                </div>
              ))}
              <AddBtn onClick={() => upd('faqs', [...kb.faqs, { id: uid(), question: '', answer: '' }])} label="Add FAQ" />
            </div>
          </Card>

          <Card icon={Ic.chat} title="Example Conversations" subtitle="Show AI how to talk — the more examples, the more natural">
            <div className="space-y-3">
              {kb.conversation_examples.map((ex, i) => (
                <div key={ex.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ex. {i + 1}</span>
                    <RemoveBtn onClick={() => upd('conversation_examples', kb.conversation_examples.filter(x => x.id !== ex.id))} />
                  </div>
                  <Textarea id={`conversation_examples.${i}.customer`} label="Customer Says" value={ex.customer} rows={2} placeholder="Do you have black shoes?"
                    onChange={(v: string) => upd('conversation_examples', kb.conversation_examples.map(x => x.id === ex.id ? { ...x, customer: v } : x))} />
                  <Textarea id={`conversation_examples.${i}.ai`} label="AI Replies" value={ex.ai} rows={2} placeholder="Yes! Classic Oxford in black..."
                    onChange={(v: string) => upd('conversation_examples', kb.conversation_examples.map(x => x.id === ex.id ? { ...x, ai: v } : x))} />
                </div>
              ))}
              <AddBtn onClick={() => upd('conversation_examples', [...kb.conversation_examples, { id: uid(), customer: '', ai: '' }])} label="Add Example" />
            </div>
          </Card>

          {/* Row 6: AI Instructions */}
          <Card icon={Ic.robot} title="AI Instructions" subtitle="Hard behavioral rules — these override everything else" className="col-span-2">
            <Textarea id="ai_instructions" label="Instructions" value={kb.ai_instructions} rows={8}
              hint="Write each instruction on a new line."
              onChange={(v: string) => upd('ai_instructions', v)}
              placeholder={`- Always greet customers warmly.\n- Never guess prices.\n- Never reveal internal cost prices.`} />
          </Card>
        </div>
      </div>

      {/* ── Right Pane: AI Optimizer Sidebar ── */}
      <aside className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col h-full z-20">
        
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600">{icons.wand}</span>
            <span className="font-bold text-slate-800 text-sm tracking-tight">AI Optimizer</span>
          </div>
          <button 
            onClick={() => runValidation(kb)} 
            disabled={isScanning}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 flex items-center gap-1 transition-colors"
          >
            {isScanning ? (
              <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 6.012l-1.17 1.169a.75.75 0 0 1-1.06-1.061l1.17-1.17a5.5 5.5 0 0 1 6.012-9.21l1.635-1.635a.75.75 0 1 1 1.06 1.06l-1.635 1.635Zm-4.95 2.122a2.5 2.5 0 1 0 3.536-3.536 2.5 2.5 0 0 0-3.536 3.536Z" clipRule="evenodd" />
              </svg>
            )}
            Run Scan
          </button>
        </div>

        {/* Score Ring Display */}
        <div className="p-6 border-b border-slate-100 flex flex-col items-center bg-slate-55/20 text-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
              <circle cx="48" cy="48" r="40" 
                stroke={report && report.score >= 90 ? '#10b981' : report && report.score >= 70 ? '#f59e0b' : '#ef4444'} 
                strokeWidth="8" fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={report ? 251.2 - (251.2 * report.score) / 100 : 251.2}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="text-2xl font-bold text-slate-800">
              {report ? `${report.score}%` : '--'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Knowledge Score</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Keep your score above 90% for high-quality, accurate AI replies.</p>
        </div>

        {/* Optimizer Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          
          {isScanning && (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-xs font-medium">Scanning knowledge base...</p>
            </div>
          )}

          {!isScanning && !report && (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-center px-4">
              <p className="text-xs font-medium">Click "Run Scan" to audit your knowledge base for conflicts and optimizations.</p>
            </div>
          )}

          {/* Errors Section (Blocking) */}
          {report && report.errors && report.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-1">Blocking Errors ({report.errors.length})</p>
              {report.errors.map((err, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-2 flex flex-col shadow-sm">
                  <p className="text-xs font-bold text-red-800">Critical: {err.message}</p>
                  {err.suggestion && (
                    <button 
                      onClick={() => handleApplySuggestion(err.field, err.suggestion!)}
                      className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 transition-colors py-1.5 px-3 rounded-lg shadow-sm w-full flex items-center justify-center gap-1"
                    >
                      {icons.wand} Fix Field
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Warnings Section (Contradictions/Conflicts) */}
          {report && activeWarnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-1">Semantic Warnings ({activeWarnings.length})</p>
              {activeWarnings.map((warn, idx) => (
                <div key={idx} className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5 flex flex-col shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">
                      {warn.type} in {warn.field}
                    </span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">{warn.message}</p>
                  </div>
                  {warn.suggestion && (
                    <div className="bg-white border border-amber-100 rounded-lg p-2.5 text-[11px] leading-normal font-mono text-slate-600">
                      <strong>Suggestion:</strong><br />
                      {warn.suggestion}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {warn.suggestion && (
                      <button 
                        onClick={() => handleApplySuggestion(warn.field, warn.suggestion!)}
                        className="flex-1 text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors py-1.5 px-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1"
                      >
                        {icons.wand} Apply
                      </button>
                    )}
                    <button 
                      onClick={() => handleIgnore(warn.field)}
                      className="flex-1 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors py-1.5 px-2.5 rounded-lg"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions Section (Optimizations) */}
          {report && activeSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest px-1">Optimizations ({activeSuggestions.length})</p>
              {activeSuggestions.map((sug, idx) => (
                <div key={idx} className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-3.5 space-y-2.5 flex flex-col shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
                      Improvement in {sug.field}
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">{sug.message}</p>
                  </div>
                  {sug.suggestion && (
                    <div className="bg-white border border-indigo-100 rounded-lg p-2.5 text-[11px] leading-normal font-mono text-slate-600">
                      <strong>Optimized text:</strong><br />
                      {sug.suggestion}
                    </div>
                  )}
                  {sug.suggestion && (
                    <button 
                      onClick={() => handleApplySuggestion(sug.field, sug.suggestion!)}
                      className="text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors py-1.5 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1 w-full"
                    >
                      {icons.wand} Apply Suggestion
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {report && activeWarnings.length === 0 && report.errors.length === 0 && activeSuggestions.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-center px-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-green-500 mb-2">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              <p className="text-xs font-bold text-slate-700">Perfect Score!</p>
              <p className="text-[11px] text-slate-400 mt-1">No conflicts or missing fields detected. Your AI assistant will operate at peak performance.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── Extra icons ─────────────────────────────────────────────────────────────
const icons = {
  wand: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.188.904zm9.356-9.356L18 12l-1.169-5.452L11 5.5l5.831-1.048L18 0l1.169 4.452L25 5.5l-5.831 1.048z" />
    </svg>
  )
};
