import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Server, 
  Database, 
  Cloud, 
  HardDrive, 
  Globe, 
  Cpu, 
  Layers, 
  Box,
  Settings
} from 'lucide-react';
import { ServiceType } from '../types';

const getIcon = (type: ServiceType) => {
  switch (type) {
    case ServiceType.EC2: return <Cpu className="w-5 h-5 text-orange-500" />;
    case ServiceType.RDS: return <Database className="w-5 h-5 text-blue-500" />;
    case ServiceType.S3: return <HardDrive className="w-5 h-5 text-green-500" />;
    case ServiceType.VPC: return <Cloud className="w-5 h-5 text-purple-500" />;
    case ServiceType.LOAD_BALANCER: return <Layers className="w-5 h-5 text-purple-400" />;
    case ServiceType.API_GATEWAY: return <Globe className="w-5 h-5 text-indigo-400" />;
    case ServiceType.LAMBDA: return <Box className="w-5 h-5 text-yellow-500" />;
    default: return <Server className="w-5 h-5 text-gray-400" />;
  }
};

const CustomNode = ({ data }: NodeProps) => {
  const envVars = data.details?.envVars ? JSON.parse(data.details.envVars) : null;
  const triggers = data.details?.triggers ? data.details.triggers.split(',') : null;

  return (
    <div className="px-4 py-3 shadow-lg rounded-md bg-slate-800 border-2 border-slate-700 min-w-[240px] hover:border-blue-500 transition-colors duration-200">
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-3 !h-3" />
      
      <div className="flex items-center mb-2">
        <div className="rounded-full bg-slate-900 p-2 border border-slate-700">
          {getIcon(data.serviceType)}
        </div>
        <div className="ml-3 overflow-hidden">
          <div className="text-sm font-bold text-slate-100 truncate" title={data.label}>{data.label}</div>
          <div className="text-xs text-slate-400">{data.serviceType}</div>
        </div>
      </div>

      {/* Configuration Section */}
      {(envVars || triggers) && (
          <div className="mt-2 pt-2 border-t border-slate-700/50">
             <div className="flex items-center text-[10px] text-slate-500 font-semibold uppercase mb-1">
                <Settings className="w-3 h-3 mr-1" /> Config Found
             </div>
             
             {triggers && (
                 <div className="mb-1">
                     <span className="text-[10px] text-purple-400 block">Triggers:</span>
                     {triggers.map((t: string, i: number) => (
                         <div key={i} className="text-[9px] text-slate-300 truncate pl-1 border-l-2 border-purple-500/30">
                             {t.split('/').pop()}
                         </div>
                     ))}
                 </div>
             )}

             {envVars && (
                 <div className="max-h-16 overflow-y-auto custom-scrollbar">
                     {Object.entries(envVars).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[9px] text-slate-400 group">
                            <span className="opacity-75 text-blue-300 max-w-[80px] truncate" title={k}>{k}:</span>
                            <span className="font-mono text-slate-300 truncate max-w-[100px]" title={String(v)}>{String(v)}</span>
                        </div>
                     ))}
                     {Object.keys(envVars).length > 4 && (
                         <div className="text-[9px] text-slate-600 italic mt-0.5">+{Object.keys(envVars).length - 4} more vars</div>
                     )}
                 </div>
             )}
          </div>
      )}

      {/* Standard Details (Tags) */}
      {data.details && !envVars && !triggers && (
        <div className="mt-3 pt-2 border-t border-slate-700 space-y-1">
             {Object.entries(data.details).slice(0, 3).map(([k, v]) => {
                if (k === 'envVars' || k === 'triggers' || k === 'arn') return null;
                return (
                <div key={k} className="flex justify-between text-[10px] text-slate-400 group">
                    <span className="opacity-75 capitalize max-w-[80px] truncate" title={k}>{k}:</span>
                    <span className="font-mono text-slate-200 truncate max-w-[100px] group-hover:text-blue-300 transition-colors" title={String(v)}>{String(v)}</span>
                </div>
             )})}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-3 !h-3" />
    </div>
  );
};

export default memo(CustomNode);