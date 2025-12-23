import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { TIERS } from '../services/layoutService';

const getLayerStyle = (label: string, theme: 'dark' | 'light') => {
  const l = label.toLowerCase();
  const isDark = theme === 'dark';

  // Opacidad aumentada para visibilidad. Colores adaptados al tema.
  if (l.includes('edge') || l.includes('public')) 
    return isDark 
      ? { bg: 'bg-purple-900/20', border: 'border-purple-500/30', text: 'text-purple-300' }
      : { bg: 'bg-purple-100/60', border: 'border-purple-300', text: 'text-purple-700' };

  if (l.includes('entry') || l.includes('load')) 
    return isDark 
      ? { bg: 'bg-indigo-900/20', border: 'border-indigo-500/30', text: 'text-indigo-300' }
      : { bg: 'bg-indigo-100/60', border: 'border-indigo-300', text: 'text-indigo-700' };

  if (l.includes('compute') || l.includes('backend')) 
    return isDark 
      ? { bg: 'bg-orange-900/15', border: 'border-orange-500/30', text: 'text-orange-300' }
      : { bg: 'bg-orange-100/60', border: 'border-orange-300', text: 'text-orange-700' };

  if (l.includes('integration') || l.includes('async')) 
    return isDark 
      ? { bg: 'bg-pink-900/15', border: 'border-pink-500/30', text: 'text-pink-300' }
      : { bg: 'bg-pink-100/60', border: 'border-pink-300', text: 'text-pink-700' };

  if (l.includes('data') || l.includes('persistence')) 
    return isDark 
      ? { bg: 'bg-blue-900/20', border: 'border-blue-500/30', text: 'text-blue-300' }
      : { bg: 'bg-blue-100/60', border: 'border-blue-300', text: 'text-blue-700' };

  if (l.includes('governance') || l.includes('security')) 
    return isDark 
      ? { bg: 'bg-slate-800/40', border: 'border-slate-500/30', text: 'text-slate-300' }
      : { bg: 'bg-slate-200/60', border: 'border-slate-300', text: 'text-slate-700' };
  
  return isDark 
    ? { bg: 'bg-white/5', border: 'border-white/10', text: 'text-slate-400' }
    : { bg: 'bg-gray-100/50', border: 'border-gray-200', text: 'text-gray-500' };
};

const LayerNode = ({ data }: NodeProps) => {
  const theme = data.theme || 'dark';
  const styles = getLayerStyle(data.label, theme);

  return (
    <div className={`w-full h-full border-t-2 border-dashed relative group transition-all duration-500 ${styles.border} ${styles.bg}`}>
      <div className={`absolute top-0 left-0 px-4 py-2 rounded-br-2xl border-b border-r backdrop-blur-md shadow-sm transition-colors ${styles.border} ${theme === 'dark' ? 'bg-[#0A0A0B]/60' : 'bg-white/60'}`}>
        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${styles.text}`}>
          {data.label}
        </span>
      </div>
      {/* Patrón de fondo más visible */}
      <div className={`w-full h-full opacity-30 pointer-events-none ${theme === 'dark' ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent' : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/5 to-transparent'}`} />
    </div>
  );
};

export default memo(LayerNode);