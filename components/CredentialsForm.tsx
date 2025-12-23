import React, { useState } from 'react';
import { ConfigFormData } from '../types';
import { Lock, Search, Key, ShieldCheck, Tag, Globe } from 'lucide-react';

interface Props {
  onSubmit: (data: ConfigFormData) => void;
  isLoading: boolean;
}

const CredentialsForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [form, setForm] = useState<ConfigFormData>({
    accessKey: '',
    secretKey: '',
    region: 'us-east-1',
    tagKey: 'Environment',
    tagValue: 'Production'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#0A0A0B]/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Conectar AWS</h2>
        <p className="text-slate-400 text-sm">Ingresa tus credenciales para escanear recursos.</p>
        <div className="mt-4 text-[11px] text-[#06B6D4] bg-[#06B6D4]/10 p-3 rounded-lg border border-[#06B6D4]/20 flex items-start text-left">
          <ShieldCheck className="w-4 h-4 inline mr-2 shrink-0 mt-0.5" />
          <span><strong>Privacidad:</strong> Las peticiones se firman localmente. Tus llaves nunca salen de tu navegador.</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Credenciales IAM</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                name="accessKey"
                placeholder="Access Key ID"
                value={form.accessKey}
                onChange={handleChange}
                className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent block w-full pl-10 p-3 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="password"
              name="secretKey"
              placeholder="Secret Access Key"
              value={form.secretKey}
              onChange={handleChange}
              className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent block w-full pl-10 p-3 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Región</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-4 w-4 text-slate-500" />
                  </div>
                  <select
                    name="region"
                    value={form.region}
                    onChange={handleChange}
                    className="bg-black/40 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent block w-full pl-10 p-3 appearance-none outline-none"
                  >
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="eu-west-1">eu-west-1 (Irlanda)</option>
                    <option value="sa-east-1">sa-east-1 (São Paulo)</option>
                  </select>
                </div>
             </div>
          </div>

          <div className="pt-4 border-t border-white/5">
             <label className="block mb-2 text-xs font-bold text-[#06B6D4] uppercase tracking-widest">Etiqueta de Filtro (Tag)</label>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      name="tagKey"
                      placeholder="Key (ej. App)"
                      value={form.tagKey}
                      onChange={handleChange}
                      className="bg-black/40 border border-white/10 text-white text-sm rounded-xl block w-full pl-10 p-3 focus:ring-2 focus:ring-[#4F46E5] outline-none"
                    />
                </div>
                <div className="relative">
                    <input
                      type="text"
                      name="tagValue"
                      placeholder="Value (ej. Web)"
                      value={form.tagValue}
                      onChange={handleChange}
                      className="bg-black/40 border border-white/10 text-white text-sm rounded-xl block w-full p-3 focus:ring-2 focus:ring-[#4F46E5] outline-none"
                    />
                </div>
             </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full text-white bg-[#4F46E5] hover:bg-[#4F46E5]/90 focus:ring-4 focus:ring-[#4F46E5]/50 font-bold rounded-xl text-sm px-5 py-4 text-center flex justify-center items-center shadow-lg shadow-[#4F46E5]/20 transition-all active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Escanenando arquitectura...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Visualizar Arquitectura
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CredentialsForm;