
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Tag, Fingerprint, Box, ExternalLink } from 'lucide-react';
import { getAwsIconUrl, DEFAULT_ICON } from '../utils/awsIcons';

const CustomNode = ({ data }: NodeProps) => {
  const iconUrl = getAwsIconUrl(data.serviceType);
  const arn = data.details?.arn || '';
  
  // Función auxiliar para truncar el ARN visualmente
  const truncateArn = (fullArn: string) => {
    if (!fullArn) return 'N/A';
    if (fullArn.length < 35) return fullArn;
    const parts = fullArn.split(':');
    // Intentar mostrar región y nombre del recurso
    if (parts.length > 5) {
        const resource = parts[parts.length - 1];
        const region = parts[3];
        // Si el recurso es muy largo, truncarlo también
        const shortResource = resource.length > 20 ? '...' + resource.slice(-18) : resource;
        return `...${region}:${shortResource}`;
    }
    return `...${fullArn.slice(-30)}`;
  };

  return (
    <div 
      className="relative flex flex-col shadow-2xl rounded-xl bg-[#0A0A0B]/95 backdrop-blur-md border border-white/10 min-w-[240px] max-w-[280px] hover:border-[#4F46E5]/80 hover:shadow-[#4F46E5]/20 transition-all duration-300 group overflow-hidden"
      // Tooltip nativo para mostrar el ARN completo al pasar el mouse
      title={arn ? `ARN: ${arn}\nNombre: ${data.label}\nTipo: ${data.serviceType}` : data.label} 
    >
      <Handle type="target" position={Position.Top} className="!bg-[#4F46E5] !w-3 !h-3 !-mt-1.5 !border-2 !border-[#0A0A0B] transition-transform group-hover:scale-125 z-50" />
      
      {/* Header: Service Type Banner */}
      <div className="bg-white/5 px-3 py-1.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Box className="w-3 h-3 text-[#06B6D4]" />
            <span className="text-[10px] font-black text-[#06B6D4] uppercase tracking-widest truncate max-w-[150px]">
                {data.serviceType}
            </span>
          </div>
          {/* Indicador de conexiones */}
          {data.details?.linkedResources && (
             <div className="flex items-center space-x-1" title="Tiene integraciones detectadas">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
             </div>
          )}
      </div>

      {/* Body: Icon & Name */}
      <div className="p-4 flex items-center">
        <div className="w-12 h-12 shrink-0 p-2 bg-gradient-to-br from-white to-slate-200 rounded-lg shadow-lg border border-white/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
             <img 
                src={iconUrl} 
                alt={data.serviceType} 
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_ICON; }}
             />
        </div>
        
        <div className="overflow-hidden flex-1">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Nombre</div>
          <div className="text-sm font-bold text-white leading-tight truncate select-all">
            {data.label}
          </div>
        </div>
      </div>

      {/* Footer: ARN & Metadata */}
      <div className="bg-black/40 px-3 py-2 border-t border-white/5">
         <div className="flex items-center justify-between group/arn cursor-help">
             <div className="flex items-center text-slate-500 w-full">
                <Fingerprint className="w-3 h-3 mr-1.5 opacity-70 shrink-0" />
                <span className="text-[10px] font-mono text-slate-400 opacity-80 group-hover/arn:text-white transition-colors truncate w-full">
                    {truncateArn(arn)}
                </span>
             </div>
         </div>
         
         {/* Optional Tags Indicator */}
         {data.details && Object.keys(data.details).length > 2 && (
             <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center">
                <Tag className="w-3 h-3 text-slate-600 mr-1.5" />
                <span className="text-[9px] text-slate-600 font-medium">
                    {Object.keys(data.details).filter(k => k !== 'arn' && k !== 'linkedResources' && k !== 'envVars').length} tags extra
                </span>
             </div>
         )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#4F46E5] !w-3 !h-3 !-mb-1.5 !border-2 !border-[#0A0A0B] transition-transform group-hover:scale-125 z-50" />
    </div>
  );
};

export default memo(CustomNode);
