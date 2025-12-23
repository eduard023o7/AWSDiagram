import React, { useMemo } from 'react';
import { CloudNode } from '../types';
import { 
  Cpu, 
  Database, 
  Cloud, 
  HardDrive, 
  Globe, 
  Layers, 
  Box, 
  Server,
  X,
  MessageSquare,
  Radio,
  Workflow,
  Shield,
  Lock,
  Zap,
  Activity,
  Network,
  Package
} from 'lucide-react';

interface Props {
  nodes: CloudNode[];
  isOpen: boolean;
  onClose: () => void;
  tagKey: string;
  tagValue: string;
  theme: 'dark' | 'light';
}

const getIcon = (type: string) => {
  const t = type.toUpperCase();

  if (t === 'EC2') return <Cpu className="w-4 h-4 text-orange-500" />;
  if (t === 'RDS') return <Database className="w-4 h-4 text-blue-500" />;
  if (t === 'S3') return <HardDrive className="w-4 h-4 text-emerald-500" />;
  if (t === 'VPC') return <Cloud className="w-4 h-4 text-indigo-500" />;
  if (t === 'ELB' || t === 'ELASTICLOADBALANCING') return <Layers className="w-4 h-4 text-purple-400" />;
  if (t === 'APIGATEWAY' || t.includes('API')) return <Globe className="w-4 h-4 text-sky-400" />;
  if (t === 'LAMBDA') return <Box className="w-4 h-4 text-amber-500" />;
  if (t === 'DYNAMODB') return <Database className="w-4 h-4 text-sky-500" />;
  
  if (t === 'SQS') return <MessageSquare className="w-4 h-4 text-pink-500" />;
  if (t === 'SNS') return <Radio className="w-4 h-4 text-pink-400" />;
  if (t === 'KINESIS' || t === 'FIREHOSE') return <Activity className="w-4 h-4 text-cyan-400" />;
  if (t === 'EVENTS' || t === 'EVENTBRIDGE') return <Zap className="w-4 h-4 text-amber-300" />;

  if (t === 'COGNITO-IDP' || t === 'COGNITO-IDENTITY') return <Lock className="w-4 h-4 text-rose-400" />;
  if (t === 'WAF' || t === 'WAFV2' || t === 'SHIELD') return <Shield className="w-4 h-4 text-rose-500" />;
  if (t === 'IAM') return <Lock className="w-4 h-4 text-slate-400" />;

  if (t === 'STATES' || t === 'STEPFUNCTIONS') return <Workflow className="w-4 h-4 text-rose-500" />;
  if (t === 'CLOUDFRONT') return <Network className="w-4 h-4 text-sky-300" />;

  return <Server className="w-4 h-4 text-slate-400" />;
};

const ResourceList: React.FC<Props> = ({ nodes, isOpen, onClose, tagKey, tagValue, theme }) => {
  const isDark = theme === 'dark';
  
  const groupedNodes = useMemo(() => {
    const groups: Record<string, CloudNode[]> = {};
    nodes.forEach(node => {
      if (!groups[node.type]) {
        groups[node.type] = [];
      }
      groups[node.type].push(node);
    });
    return groups;
  }, [nodes]);

  const bgClass = isDark ? 'bg-slate-900/40' : 'bg-white';
  const headerClass = isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-gray-50/90 border-gray-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const itemBg = isDark ? 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-800/60' : 'bg-white border-gray-100 shadow-sm hover:border-blue-400/50 hover:shadow-md';
  const itemBorder = isDark ? 'hover:border-blue-500/30' : '';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-800';
  const textSecondary = isDark ? 'text-slate-500' : 'text-slate-500';
  const iconBg = isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-gray-50 border-gray-200';
  const footerBg = isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-gray-50/90 border-gray-200';
  const footerCardBg = isDark ? 'bg-slate-900/50 border-slate-700/30' : 'bg-white border-gray-200';

  if (!isOpen) return null;

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      <div className={`p-5 border-b flex justify-between items-center backdrop-blur-sm sticky top-0 z-10 ${headerClass}`}>
        <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h2 className={`text-sm font-black uppercase tracking-widest ${textTitle}`}>Inventario</h2>
        </div>
        <button onClick={onClose} className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white' : 'hover:bg-gray-200 text-slate-500 hover:text-slate-900'}`}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        {Object.entries(groupedNodes).map(([type, typeNodes]) => {
          const nodesOfType = typeNodes as CloudNode[];
          return (
            <div key={type} className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest ${isDark ? 'bg-slate-800 text-blue-400 border-slate-700/50' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {type}
                </span>
                <span className="text-[10px] text-slate-500 font-bold">{nodesOfType.length} recursos</span>
              </div>
              
              <ul className="space-y-2">
                {nodesOfType.map(node => (
                  <li key={node.id} className={`rounded-xl border p-3 transition-all group cursor-default ${itemBg} ${itemBorder}`}>
                    <div className="flex items-start">
                      <div className={`mt-0.5 mr-3 p-2 rounded-lg border transition-all group-hover:border-blue-500/20 ${iconBg}`}>
                          {getIcon(node.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate group-hover:text-blue-500 transition-colors ${textPrimary}`} title={node.label}>
                          {node.label}
                        </p>
                        <p className={`text-[10px] font-mono truncate mt-0.5 ${textSecondary}`}>
                          {node.id}
                        </p>
                        {node.details && node.details[tagKey] && (
                            <div className="flex items-center mt-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border truncate max-w-full uppercase ${isDark ? 'bg-blue-900/20 text-blue-400 border-blue-900/30' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                  {tagKey}: {node.details[tagKey]}
                                </span>
                            </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      
      <div className={`p-5 border-t backdrop-blur-sm ${footerBg}`}>
        <div className={`flex items-center justify-between p-3 rounded-xl border ${footerCardBg}`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Recursos</span>
            <span className="text-sm font-black text-blue-400">{nodes.length}</span>
        </div>
      </div>
    </div>
  );
};

export default ResourceList;