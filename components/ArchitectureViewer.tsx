import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant
} from 'reactflow';
import CustomNode from './CustomNode';
import ResourceList from './ResourceList';
import { ArchitectureData, ConfigFormData } from '../types';
import { getLayoutedElements } from '../services/layoutService';
import { Download, Tag, X, List, Layout, Maximize, Minimize, ChevronDown } from 'lucide-react';
import { downloadDrawIo, downloadLucidXml } from '../utils/export';

interface Props {
  data: ArchitectureData;
  config: ConfigFormData;
  onReset: () => void;
}

const ArchitectureViewer: React.FC<Props> = ({ data, config, onReset }) => {
  const [isListOpen, setIsListOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true); 
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  // Initial Node Setup
  const initialNodes: Node[] = useMemo(() => data.nodes.map(n => ({
      id: n.id,
      position: { x: 0, y: 0 }, 
      data: { label: n.label, serviceType: n.type, details: n.details },
      type: 'custom'
  })), [data.nodes]);

  const initialEdges: Edge[] = useMemo(() => data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true,
      style: e.style || { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.style?.stroke || '#64748b',
      },
  })), [data.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const spacingMode = isExpanded ? 'expanded' : 'compact';
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes, 
      initialEdges, 
      'TB',
      spacingMode
    );
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges, isExpanded, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const handleExportDrawIo = useCallback(() => {
    downloadDrawIo(nodes, edges);
    setIsExportMenuOpen(false);
  }, [nodes, edges]);

  const handleExportLucid = useCallback(() => {
    downloadLucidXml(nodes, edges);
    setIsExportMenuOpen(false);
  }, [nodes, edges]);

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 overflow-hidden">
      <div className="h-16 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-6 z-30 shadow-md">
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">CS</div>
                <h1 className="text-xl font-bold text-slate-100 hidden md:block">CloudScale</h1>
            </div>
            
            <div className="h-8 w-px bg-slate-600 mx-2"></div>

            <button 
                onClick={() => setIsListOpen(!isListOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all ${isListOpen ? 'bg-blue-600/20 border-blue-500/50 text-blue-200' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
            >
                {isListOpen ? <Layout className="w-4 h-4" /> : <List className="w-4 h-4" />}
                <span className="text-sm font-medium hidden sm:inline">{isListOpen ? 'Hide List' : 'Show List'}</span>
            </button>

            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all ${isExpanded ? 'bg-purple-600/20 border-purple-500/50 text-purple-200' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
                title={isExpanded ? "Switch to Compact View" : "Switch to Expanded View"}
            >
                {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                <span className="text-sm font-medium hidden sm:inline">{isExpanded ? 'Expanded' : 'Compact'}</span>
            </button>
        </div>
        
        <div className="flex items-center space-x-3">
             <div className="flex items-center space-x-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700 mr-2 hidden lg:flex">
               <Tag className="w-3 h-3 text-blue-400" />
               <span className="text-sm text-slate-300">
                  <span className="font-mono text-blue-300">{config.tagKey}</span>
                  <span className="text-slate-600 mx-1">=</span>
                  <span className="font-mono text-green-300">{config.tagValue}</span>
               </span>
            </div>

            <div className="relative">
                <button 
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-sm transition-colors border border-slate-600"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                    <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                </button>
                
                {isExportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95">
                        <div className="py-1">
                            <button
                                onClick={handleExportDrawIo}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                                <span className="font-medium block">Draw.io Format</span>
                                <span className="text-[10px] text-slate-500">.drawio (XML)</span>
                            </button>
                            <div className="h-px bg-slate-700 mx-2"></div>
                            <button
                                onClick={handleExportLucid}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                                <span className="font-medium block">LucidChart Format</span>
                                <span className="text-[10px] text-slate-500">.xml (Plain)</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={onReset}
                className="flex items-center px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-md text-sm transition-colors border border-red-900"
            >
                <X className="w-4 h-4 mr-2" />
                Close
            </button>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative flex" onClick={() => setIsExportMenuOpen(false)}>
        {/* Resource List Sidebar */}
        <div className={`relative transition-all duration-300 ease-in-out ${isListOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
             <ResourceList 
                nodes={data.nodes} 
                isOpen={true} 
                onClose={() => setIsListOpen(false)} 
                tagKey={config.tagKey}
                tagValue={config.tagValue}
             />
        </div>

        {/* Graph Area */}
        <div className="flex-1 h-full relative bg-slate-900">
            <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-900"
            >
            <Background color="#1e293b" gap={20} variant={BackgroundVariant.Dots} />
            <Controls className="bg-slate-800 border-slate-700 fill-slate-200 text-slate-200" />
            <MiniMap 
                nodeColor="#334155" 
                maskColor="rgba(15, 23, 42, 0.8)"
                className="bg-slate-800 border-slate-700 rounded-lg overflow-hidden" 
            />
            </ReactFlow>
            
            <div className="absolute bottom-6 right-6 bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-xl max-w-xs pointer-events-none opacity-80 z-10">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Legend</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span> Compute</div>
                    <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> Database</div>
                    <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span> Network</div>
                    <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Storage</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureViewer;