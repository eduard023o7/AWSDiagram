import React, { useMemo } from 'react';
import { CloudNode, ServiceType } from '../types';
import { 
  Cpu, 
  Database, 
  Cloud, 
  HardDrive, 
  Globe, 
  Layers, 
  Box, 
  Server,
  X
} from 'lucide-react';

interface Props {
  nodes: CloudNode[];
  isOpen: boolean;
  onClose: () => void;
  tagKey: string;
  tagValue: string;
}

const getIcon = (type: ServiceType) => {
  switch (type) {
    case ServiceType.EC2: return <Cpu className="w-4 h-4 text-orange-500" />;
    case ServiceType.RDS: return <Database className="w-4 h-4 text-blue-500" />;
    case ServiceType.S3: return <HardDrive className="w-4 h-4 text-green-500" />;
    case ServiceType.VPC: return <Cloud className="w-4 h-4 text-purple-500" />;
    case ServiceType.LOAD_BALANCER: return <Layers className="w-4 h-4 text-purple-400" />;
    case ServiceType.API_GATEWAY: return <Globe className="w-4 h-4 text-indigo-400" />;
    case ServiceType.LAMBDA: return <Box className="w-4 h-4 text-yellow-500" />;
    default: return <Server className="w-4 h-4 text-gray-400" />;
  }
};

const ResourceList: React.FC<Props> = ({ nodes, isOpen, onClose, tagKey, tagValue }) => {
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

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-0 h-full w-80 bg-slate-800 border-r border-slate-700 shadow-2xl z-20 flex flex-col transform transition-transform duration-300 ease-in-out">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
        <h2 className="text-lg font-bold text-slate-100">Resource Inventory</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedNodes).map(([type, typeNodes]) => (
          <div key={type}>
            <div className="flex items-center mb-3">
              <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                {type}
              </span>
              <span className="ml-2 text-xs text-slate-500">{typeNodes.length} resources</span>
            </div>
            
            <ul className="space-y-2">
              {typeNodes.map(node => (
                <li key={node.id} className="bg-slate-900/50 rounded border border-slate-700/50 p-3 hover:border-blue-500/50 transition-colors">
                  <div className="flex items-start">
                    <div className="mt-0.5 mr-2 p-1.5 bg-slate-800 rounded border border-slate-700">
                        {getIcon(node.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate" title={node.label}>
                        {node.label}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono truncate mb-1">
                        ID: {node.id}
                      </p>
                      {/* Explicitly show the tag if present in details */}
                      {node.details && node.details[tagKey] && (
                          <div className="flex items-center mt-1">
                              <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-900/50 truncate max-w-full">
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
        ))}
      </div>
      
      <div className="p-4 border-t border-slate-700 bg-slate-900 text-center">
        <p className="text-xs text-slate-500">
            Total Resources: <span className="text-white font-bold">{nodes.length}</span>
        </p>
      </div>
    </div>
  );
};

export default ResourceList;
