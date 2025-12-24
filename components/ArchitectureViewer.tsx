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
  BackgroundVariant,
  Connection,
  addEdge,
  updateEdge,
  applyEdgeChanges,
  applyNodeChanges,
  EdgeChange,
  NodeChange
} from 'reactflow';
import CustomNode from './CustomNode';
import LayerNode from './LayerNode';
import ResourceList from './ResourceList';
import { ArchitectureData, ConfigFormData } from '../types';
import { getLayoutedElements, TIER_HEIGHT, TIERS, TIER_LABELS } from '../services/layoutService';
import { Download, Tag, X, List, Layout, Maximize, Minimize, ChevronDown, Monitor, FileSpreadsheet, RefreshCw, AlertCircle, Moon, Sun, Undo2, Map } from 'lucide-react';
import { downloadDrawIo, downloadResourceCsv } from '../utils/export';

interface Props {
  data: ArchitectureData;
  config: ConfigFormData;
  onReset: () => void;
  onUpdateTags: (key: string, value: string) => void;
  error?: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

// Historial Simple
interface HistoryState {
    nodes: Node[];
    edges: Edge[];
}

const ArchitectureViewer: React.FC<Props> = ({ data, config, onReset, onUpdateTags, error, theme, toggleTheme }) => {
  const [isListOpen, setIsListOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true); 
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(true); // Toggle MiniMap
  
  const [newTagKey, setNewTagKey] = useState(config.tagKey);
  const [newTagValue, setNewTagValue] = useState(config.tagValue);

  // Undo System
  const [history, setHistory] = useState<HistoryState[]>([]);
  
  // Initial Nodes Setup
  const resourceNodes: Node[] = useMemo(() => data.nodes.map(n => ({
      id: n.id,
      position: { x: 0, y: 0 }, 
      data: { label: n.label, serviceType: n.type, details: n.details, theme }, 
      type: 'custom'
  })), [data.nodes, theme]);

  const initialEdges: Edge[] = useMemo(() => data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true,
      type: 'default',
      style: e.style || { stroke: '#4F46E5', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.style?.stroke || '#4F46E5',
      },
  })), [data.edges]);

  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  // Load Initial Layout
  useEffect(() => {
    const spacingMode = isExpanded ? 'expanded' : 'compact';
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      resourceNodes, 
      initialEdges, 
      'TB',
      spacingMode
    );

    let minX = Infinity;
    let maxX = -Infinity;
    layoutedNodes.forEach(n => {
        if (n.position.x < minX) minX = n.position.x;
        if (n.position.x > maxX) maxX = n.position.x;
    });
    
    const totalWidth = Math.max(1200, (maxX - minX) + 600);
    const startX = minX - 300;

    const layerNodes: Node[] = Object.values(TIERS).map(tierIndex => ({
        id: `layer-${tierIndex}`,
        type: 'layer',
        position: { x: startX, y: tierIndex * TIER_HEIGHT },
        data: { label: TIER_LABELS[tierIndex], theme }, 
        style: { width: totalWidth, height: TIER_HEIGHT, zIndex: -10 },
        selectable: false,
        draggable: false,
    }));
    
    setNodes([...layerNodes, ...layoutedNodes]);
    setEdges(layoutedEdges);
    // Initial history snapshot
    setHistory([]);
  }, [resourceNodes, initialEdges, isExpanded, setNodes, setEdges, theme]);

  // --- HISTORY MANAGEMENT ---
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
        const newHistory = [...prev, { nodes, edges }];
        if (newHistory.length > 20) newHistory.shift(); // Limit history size
        return newHistory;
    });
  }, [nodes, edges]);

  const handleUndo = useCallback(() => {
      if (history.length === 0) return;
      const lastState = history[history.length - 1];
      setNodes(lastState.nodes);
      setEdges(lastState.edges);
      setHistory(prev => prev.slice(0, -1));
  }, [history, setNodes, setEdges]);

  // --- GRAPH HANDLERS ---
  const onNodesChange = useCallback((changes: NodeChange[]) => {
      // If deleting, save history first
      if (changes.some(c => c.type === 'remove')) {
          saveToHistory();
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes, saveToHistory]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
      // If deleting, save history first
      if (changes.some(c => c.type === 'remove')) {
          saveToHistory();
      }
      setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges, saveToHistory]);

  const onConnect = useCallback((params: Connection) => {
    saveToHistory();
    setEdges((eds) => addEdge({ 
        ...params, 
        type: 'default', 
        animated: true, 
        style: { stroke: '#4F46E5', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4F46E5' }
    }, eds));
  }, [setEdges, saveToHistory]);

  const onEdgeUpdateStart = useCallback(() => {
      saveToHistory();
  }, [saveToHistory]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setEdges((els) => updateEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  // --- EXPORT HANDLERS (USING CURRENT STATE) ---
  const handleExportDrawIo = useCallback(() => {
    // Pass ALL nodes (including layers) to the export function to render background tiers
    downloadDrawIo(nodes, edges);
    setIsExportMenuOpen(false);
  }, [nodes, edges]);

  const handleExportCsv = useCallback(() => {
      // CSV only needs resource nodes
      downloadResourceCsv(nodes.filter(n => n.type === 'custom'));
      setIsExportMenuOpen(false);
  }, [nodes]);

  const handleTagUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTags(newTagKey, newTagValue);
    setIsTagMenuOpen(false);
  };

  const nodeTypes = useMemo(() => ({ custom: CustomNode, layer: LayerNode }), []);

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-[#0A0A0B]' : 'bg-gray-50';
  const headerColor = isDark ? 'bg-[#0A0A0B]/95 border-white/10' : 'bg-white/95 border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const buttonBase = isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-gray-200 text-slate-500 hover:text-slate-900 hover:bg-gray-50';
  const buttonActive = isDark ? 'bg-[#4F46E5]/10 border-[#4F46E5]/30 text-[#4F46E5]' : 'bg-[#4F46E5]/10 border-[#4F46E5]/30 text-[#4F46E5]';

  // Controls Style: Grayscale High Contrast
  const controlsStyle = isDark 
     ? '!bg-[#222] !border-white/20 !fill-white [&>button]:!fill-white [&>button]:!border-white/20 [&>button:hover]:!bg-white/20' 
     : '!bg-white !border-gray-400 !fill-black [&>button]:!fill-black [&>button]:!border-gray-300 [&>button:hover]:!bg-gray-100';

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden transition-colors duration-300 ${bgColor}`}>
      {/* Barra de herramientas superior */}
      <div className={`h-16 border-b backdrop-blur-md flex items-center justify-between px-6 z-30 shadow-xl transition-colors ${headerColor}`}>
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 mr-4">
                <div className="h-9 w-9 bg-gradient-to-br from-[#4F46E5] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg shadow-[#4F46E5]/20">
                    <Monitor className="w-5 h-5 text-white" />
                </div>
                <h1 className={`text-lg font-bold hidden md:block tracking-tight ${textColor}`}>CloudArchitect <span className="text-[#06B6D4]">Live</span></h1>
            </div>
            
            <div className={`h-8 w-px mx-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>

            <button 
                onClick={() => setIsListOpen(!isListOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-200 ${isListOpen ? buttonActive : buttonBase}`}
            >
                {isListOpen ? <Layout className="w-4 h-4" /> : <List className="w-4 h-4" />}
                <span className="text-sm font-medium hidden sm:inline">{isListOpen ? 'Ocultar Lista' : 'Inventario'}</span>
            </button>

            <button 
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-200 ${history.length > 0 ? (isDark ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-gray-100') : 'opacity-50 cursor-not-allowed'} ${buttonBase}`}
                title="Deshacer cambios (Ctrl+Z)"
            >
                <Undo2 className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Deshacer</span>
            </button>
            
            <button
                onClick={toggleTheme}
                className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 ${buttonBase}`}
                title="Cambiar tema"
            >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
        </div>
        
        <div className="flex items-center space-x-3">
            {/* Tag Menu */}
            <div className="relative">
                <button 
                    onClick={() => {
                        setIsTagMenuOpen(!isTagMenuOpen);
                        setIsExportMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all shadow-inner group ${isDark ? 'bg-black/40 border-white/10 hover:bg-black/60' : 'bg-gray-100 border-gray-200 hover:bg-gray-200'}`}
                >
                    <Tag className="w-3.5 h-3.5 text-[#06B6D4] group-hover:scale-110 transition-transform" />
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className="font-mono text-[#06B6D4]">{config.tagKey}</span>
                        <span className={`mx-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>:</span>
                        <span className="font-mono text-[#8B5CF6]">{config.tagValue}</span>
                    </span>
                    <RefreshCw className={`w-3 h-3 ml-1 ${subTextColor}`} />
                </button>
                {isTagMenuOpen && (
                    <div className={`absolute right-0 mt-3 w-72 border rounded-2xl shadow-2xl z-50 p-5 animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0A0A0B] border-white/10' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-sm font-bold uppercase tracking-wider ${textColor}`}>Actualizar Filtro</h3>
                            <button onClick={() => setIsTagMenuOpen(false)} className={`p-1 rounded-md ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><X className={`w-4 h-4 ${subTextColor}`} /></button>
                        </div>
                        <form onSubmit={handleTagUpdate} className="space-y-3">
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${subTextColor}`}>Tag Key</label>
                                <input type="text" value={newTagKey} onChange={(e) => setNewTagKey(e.target.value)} className={`w-full p-2.5 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-[#4F46E5] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-slate-900'}`} />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${subTextColor}`}>Tag Value</label>
                                <input type="text" value={newTagValue} onChange={(e) => setNewTagValue(e.target.value)} className={`w-full p-2.5 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-[#4F46E5] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-slate-900'}`} />
                            </div>
                            <button type="submit" className="w-full bg-[#4F46E5] hover:bg-[#4338ca] text-white font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-[#4F46E5]/20 mt-2 transition-all">Actualizar Vista</button>
                        </form>
                    </div>
                )}
            </div>

            {/* Export Menu */}
            <div className="relative">
                <button 
                    onClick={() => {
                        setIsExportMenuOpen(!isExportMenuOpen);
                        setIsTagMenuOpen(false);
                    }}
                    className="bg-[#4F46E5] hover:bg-[#4338ca] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#4F46E5]/20 flex items-center transition-all active:scale-95"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                    <ChevronDown className="w-3 h-3 ml-2 opacity-70" />
                </button>
                {isExportMenuOpen && (
                    <div className={`absolute right-0 mt-3 w-56 border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0A0A0B] border-white/10' : 'bg-white border-gray-200'}`}>
                         <div className={`p-3 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}><span className={`text-[10px] font-bold uppercase tracking-widest pl-2 ${subTextColor}`}>Formatos</span></div>
                        <div className="p-2 space-y-1">
                            <button onClick={handleExportDrawIo} className={`w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-center font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'}`}><div className="w-6 h-6 rounded bg-[#F08705]/20 text-[#F08705] flex items-center justify-center mr-3"><Layout className="w-3.5 h-3.5" /></div>Draw.io / Diagrams.net</button>
                            <button onClick={handleExportCsv} className={`w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-center font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'}`}><div className="w-6 h-6 rounded bg-[#10B981]/20 text-[#10B981] flex items-center justify-center mr-3"><FileSpreadsheet className="w-3.5 h-3.5" /></div>CSV Inventory</button>
                        </div>
                    </div>
                )}
            </div>
            <button onClick={onReset} className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`} title="Desconectar"><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Resource List Sidebar */}
        <div className={`border-r transition-all duration-500 ease-in-out z-20 absolute h-full md:relative overflow-hidden ${isListOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-full md:translate-x-0 opacity-0 md:w-0'} ${isDark ? 'bg-[#0A0A0B]/95 border-white/10' : 'bg-white/95 border-gray-200'}`}>
            <div className="h-full w-80"><ResourceList nodes={data.nodes} isOpen={true} onClose={() => setIsListOpen(false)} tagKey={config.tagKey} tagValue={config.tagValue} theme={theme} /></div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 h-full relative bg-transparent">
          {error && <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl flex items-center animate-in slide-in-from-top-4"><AlertCircle className="w-4 h-4 mr-2" />{error}</div>}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange} // Handles node removal
            onEdgesChange={onEdgesChange} // Handles edge removal
            onConnect={onConnect}
            onEdgeUpdate={onEdgeUpdate}
            onEdgeUpdateStart={onEdgeUpdateStart}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{ type: 'default', animated: true }}
            className={isDark ? "react-flow-dark" : "react-flow-light"}
            deleteKeyCode={["Backspace", "Delete"]} // Enable delete
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={isDark ? '#333' : '#cbd5e1'} />
            <Controls className={`!rounded-xl !border overflow-hidden !shadow-xl ${controlsStyle}`} />
            {isMiniMapOpen && (
                <MiniMap 
                    nodeColor={(n) => { if (n.type === 'layer') return 'transparent'; return isDark ? '#4F46E5' : '#8B5CF6'; }}
                    maskColor={isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(240, 240, 240, 0.7)'}
                    className={`!rounded-xl !border !shadow-2xl !bottom-8 !right-8 !m-0 ${isDark ? '!bg-[#0A0A0B] !border-white/10' : '!bg-white !border-gray-200'}`}
                />
            )}
          </ReactFlow>
          
          {/* MiniMap Toggle Button */}
          <div className="absolute bottom-6 right-6 z-50">
             {!isMiniMapOpen ? (
                 <button onClick={() => setIsMiniMapOpen(true)} className={`p-2 rounded-xl border shadow-lg ${buttonBase}`} title="Mostrar MiniMapa"><Map className="w-5 h-5" /></button>
             ) : (
                 <button onClick={() => setIsMiniMapOpen(false)} className={`absolute -top-10 right-0 p-1.5 rounded-lg border shadow-lg text-[10px] flex items-center ${buttonBase} bg-opacity-90`} title="Ocultar MiniMapa"><X className="w-3 h-3 mr-1"/> Ocultar</button>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ArchitectureViewer;