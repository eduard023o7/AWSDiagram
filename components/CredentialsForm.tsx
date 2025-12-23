import React, { useState } from 'react';
import { ConfigFormData } from '../types';
import { Lock, Search, Key, ShieldCheck, Tag } from 'lucide-react';

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
    <div className="w-full max-w-lg mx-auto bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Connect Cloud</h2>
        <p className="text-slate-400">Visualize your AWS infrastructure safely.</p>
        <div className="mt-2 text-xs text-yellow-500/80 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
          <ShieldCheck className="w-3 h-3 inline mr-1" />
          Secure Mode: Keys are used for simulation context only. No direct API calls are made from the browser.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              name="accessKey"
              placeholder="AWS Access Key ID"
              value={form.accessKey}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 placeholder-slate-600"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="password"
              name="secretKey"
              placeholder="AWS Secret Access Key"
              value={form.secretKey}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 placeholder-slate-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block mb-2 text-sm font-medium text-slate-300">Region</label>
                <select
                  name="region"
                  value={form.region}
                  onChange={handleChange}
                  className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value="us-east-1">us-east-1</option>
                  <option value="us-west-2">us-west-2</option>
                  <option value="eu-west-1">eu-west-1</option>
                </select>
             </div>
             <div className="flex items-end">
                <div className="w-full"></div>
             </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
             <label className="block mb-2 text-sm font-medium text-blue-400">Filter by Tag</label>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      name="tagKey"
                      placeholder="Tag Key (e.g. Env)"
                      value={form.tagKey}
                      onChange={handleChange}
                      className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg block w-full pl-9 p-2.5"
                    />
                </div>
                <div className="relative">
                    <input
                      type="text"
                      name="tagValue"
                      placeholder="Value (e.g. Prod)"
                      value={form.tagValue}
                      onChange={handleChange}
                      className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg block w-full p-2.5"
                    />
                </div>
             </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-3 text-center flex justify-center items-center transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Discovering Topology...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Visualize Architecture
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CredentialsForm;
