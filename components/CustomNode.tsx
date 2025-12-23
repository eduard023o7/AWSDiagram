import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings } from 'lucide-react';
import { getAwsIconUrl, DEFAULT_ICON } from '../utils/awsIcons';

const CustomNode = ({ data }: NodeProps) => {
  const envVars = data.details?.envVars ? JSON.parse(data.details.envVars) : null;
  const triggers = data.details?.triggers ? data.details.triggers.split(',') : null;
  const iconUrl = getAwsIconUrl(data.serviceType);

  return (
    <div className="relative px-4 py-4 shadow-xl rounded-lg bg-slate-800 border border-slate-600 min-w-[220px] max-w-[280px] hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 group-node">
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3 !-mt-1.5" />
      
      <div className="flex items-start">
        <div className="w-12 h-12 shrink-0 p-1 bg-white/5 rounded-md border border-white/10 flex items-center justify-center">
             <img 
                src={iconUrl} 
                alt={data.serviceType} 
                className="w-full h-full object-contain"
                onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    if (target.src !== DEFAULT_ICON) {
                        target.src = DEFAULT_ICON;
                        target.style.opacity = '0.5';
                    }
                }}
             />
        </div>
        
        <div className="ml-3 overflow-hidden flex-1">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">{data.serviceType}</div>
          <div className="text-sm font-semibold text-slate-100 leading-tight truncate" title={data.label}>{data.label}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">{data.id}</div>
        </div>
      </div>

      {/* Configuration Section */}
      {(envVars || triggers) && (
          <div className="mt-3 pt-2 border-t border-slate-700/50 bg-slate-900/30 rounded px-2 pb-2 -mx-2 mb-[-8px]">
             <div className="flex items-center text-[9px] text-slate-500 font-bold uppercase mb-1.5 tracking-wide">
                <Settings className="w-3 h-3 mr-1" /> Configuration
             </div>
             
             {triggers && (
                 <div className="mb-2">
                     <span className="text-[9px] text-purple-400 block mb-0.5">Triggers:</span>
                     {triggers.map((t: string, i: number) => (
                         <div key={i} className="text-[9px] text-slate-300 truncate pl-2 border-l-2 border-purple-500/30 mb-0.5">
                             {t.split('/').pop()}
                         </div>
                     ))}
                 </div>
             )}

             {envVars && (
                 <div className="max-h-20 overflow-y-auto custom-scrollbar">
                     {Object.entries(envVars).slice(0, 3).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[9px] text-slate-400 mb-0.5 border-b border-white/5 pb-0.5 last:border-0">
                            <span className="opacity-75 text-blue-300 max-w-[90px] truncate mr-2" title={k}>{k}</span>
                            <span className="font-mono text-slate-300 truncate flex-1 text-right" title={String(v)}>{String(v)}</span>
                        </div>
                     ))}
                     {Object.keys(envVars).length > 3 && (
                         <div className="text-[9px] text-slate-500 italic mt-1 text-right">+{Object.keys(envVars).length - 3} more</div>
                     )}
                 </div>
             )}
          </div>
      )}

      {/* Standard Details (Tags) - Only show if no extensive config to keep node size manageable */}
      {data.details && !envVars && !triggers && (
        <div className="mt-3 pt-2 border-t border-slate-700 space-y-1">
             {Object.entries(data.details).slice(0, 3).map(([k, v]) => {
                if (k === 'envVars' || k === 'triggers' || k === 'arn' || k === 'linkedResources') return null;
                return (
                <div key={k} className="flex justify-between text-[10px] text-slate-400">
                    <span className="opacity-75 capitalize max-w-[80px] truncate" title={k}>{k}:</span>
                    <span className="font-mono text-slate-300 truncate max-w-[100px] hover:text-white transition-colors" title={String(v)}>{String(v)}</span>
                </div>
             )})}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3 !-mb-1.5" />
    </div>
  );
};

export default memo(CustomNode);