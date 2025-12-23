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
import LayerNode from './LayerNode';
import ResourceList from './ResourceList';
import { ArchitectureData, ConfigFormData } from '../types';
import { getLayoutedElements, TIER_HEIGHT, TIERS, TIER_LABELS } from '../services/layoutService';
import { Download, Tag, X, List, Layout, Maximize, Minimize, ChevronDown, Monitor, FileSpreadsheet, RefreshCw, AlertCircle } from 'lucide-react';
import { downloadDrawIo, downloadLucidXml, downloadResourceCsv } from '../utils/export';

interface Props {
  data: ArchitectureData;
  config: ConfigFormData;
  onReset: () => void;
  onUpdateTags: (key: string, value: string) => void;
  error?: string | null;
}

const ArchitectureViewer: React.FC<Props> = ({ data, config, onReset, onUpdateTags, error }) => {
  const [isListOpen, setIsListOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true); 
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  
  const [newTagKey, setNewTagKey] = useState(config.tagKey);
  const [newTagValue, setNewTagValue] = useState(config.tagValue);

  // Inicialización de nodos de recursos
  const resourceNodes: Node[] = useMemo(() => data.nodes.map(n => ({
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
      style: e.style || { stroke: '#4F46E5', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.style?.stroke || '#4F46E5',
      },
  })), [data.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const spacingMode = isExpanded ? 'expanded' : 'compact';
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      resourceNodes, 
      initialEdges, 
      'TB',
      spacingMode
    );

    // Calcular dimensiones totales para las capas
    let minX = Infinity;
    let maxX = -Infinity;
    layoutedNodes.forEach(n => {
        if (n.position.x < minX) minX = n.position.x;
        if (n.position.x > maxX) maxX = n.position.x;
    });
    
    // Ancho total con padding generoso
    const totalWidth = Math.max(1200, (maxX - minX) + 600);
    const startX = minX - 300;

    // Crear nodos de capa visuales
    const layerNodes: Node[] = Object.values(TIERS).map(tierIndex => ({
        id: `layer-${tierIndex}`,
        type: 'layer',
        position: { x: startX, y: tierIndex * TIER_HEIGHT },
        data: { label: TIER_LABELS[tierIndex] },
        style: { width: totalWidth, height: TIER_HEIGHT, zIndex: -10 },
        selectable: false,
        draggable: false,
    }));
    
    setNodes([...layerNodes, ...layoutedNodes]);
    setEdges(layoutedEdges);
  }, [resourceNodes, initialEdges, isExpanded, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({ 
      custom: CustomNode,
      layer: LayerNode 
  }), []);

  const handleExportDrawIo = useCallback(() => {
    downloadDrawIo(nodes.filter(n => n.type === 'custom'), edges);
    setIsExportMenuOpen(false);
  }, [nodes, edges]);

  const handleExportLucid = useCallback(() => {
    downloadLucidXml(nodes.filter(n => n.type === 'custom'), edges);
    setIsExportMenuOpen(false);
  }, [nodes, edges]);

  const handleExportCsv = useCallback(() => {
      downloadResourceCsv(nodes.filter(n => n.type === 'custom'));
      setIsExportMenuOpen(false);
  }, [nodes]);

  const handleTagUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTags(newTagKey, newTagValue);
    setIsTagMenuOpen(false);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#0A0A0B] overflow-hidden">
      {/* Barra de herramientas superior */}
      <div className="h-16 border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur-md flex items-center justify-between px-6 z-30 shadow-xl">
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 mr-4">
                <div className="h-9 w-9 bg-gradient-to-br from-[#4F46E5] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg shadow-[#4F46E5]/20">
                    <Monitor className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold text-white hidden md:block tracking-tight">CloudArchitect <span className="text-[#06B6D4]">Live</span></h1>
            </div>
            
            <div className="h-8 w-px bg-white/10 mx-2"></div>

            <button 
                onClick={() => setIsListOpen(!isListOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-200 ${isListOpen ? 'bg-[#4F46E5]/10 border-[#4F46E5]/30 text-[#4F46E5]' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
                {isListOpen ? <Layout className="w-4 h-4" /> : <List className="w-4 h-4" />}
                <span className="text-sm font-medium hidden sm:inline">{isListOpen ? 'Ocultar Lista' : 'Inventario'}</span>
            </button>

            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-200 ${isExpanded ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6]' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
                {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                <span className="text-sm font-medium hidden sm:inline">{isExpanded ? 'Compactar' : 'Expandir'}</span>
            </button>
        </div>
        
        <div className="flex items-center space-x-3">
            {/* Botón para cambiar Tag */}
            <div className="relative">
                <button 
                    onClick={() => {
                        setIsTagMenuOpen(!isTagMenuOpen);
                        setIsExportMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 bg-black/40 hover:bg-black/60 px-4 py-2 rounded-xl border border-white/10 transition-all shadow-inner group"
                >
                    <Tag className="w-3.5 h-3.5 text-[#06B6D4] group-hover:scale-110 transition-transform" />
                    <span className="text-xs text-slate-300 font-medium">
                        <span className="font-mono text-[#06B6D4]">{config.tagKey}</span>
                        <span className="text-slate-600 mx-1.5">:</span>
                        <span className="font-mono text-[#8B5CF6]">{config.tagValue}</span>
                    </span>
                    <RefreshCw className="w-3 h-3 text-slate-500 ml-1" />
                </button>

                {isTagMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-[#0A0A0B] border border-white/10 rounded-2xl shadow-2xl z-50 p-5 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xs font-black text-[#06B6D4] uppercase tracking-widest mb-4">Filtrar por otro Tag</h3>
                        <form onSubmit={handleTagUpdate} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Key</label>
                                <input 
                                    type="text" 
                                    value={newTagKey} 
                                    onChange={(e) => setNewTagKey(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#4F46E5]"
                                    placeholder="ej. Environment"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Value</label>
                                <input 
                                    type="text" 
                                    value={newTagValue} 
                                    onChange={(e) => setNewTagValue(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#4F46E5]"
                                    placeholder="ej. Production"
                                />
                            </div>
                            <button 
                                type="submit"
                                className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center"
                            >
                                <RefreshCw className="w-3 h-3 mr-2" />
                                Actualizar Arquitectura
                            </button>
                        </form>
                    </div>
                )}
            </div>

            <div className="relative">
                <button 
                    onClick={() => {
                        setIsExportMenuOpen(!isExportMenuOpen);
                        setIsTagMenuOpen(false);
                    }}
                    className="flex items-center px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white rounded-xl text-sm font-semibold transition-all shadow-lg active:scale-95"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                    <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                </button>
                
                {isExportMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-[#0A0A0B] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2">
                            <button
                                onClick={handleExportDrawIo}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors group"
                            >
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 mr-3"></div>
                                    <div>
                                        <span className="font-bold block">Draw.io (XML)</span>
                                        <span className="text-[10px] text-slate-500 font-medium italic">Compatible diagramas</span>
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={handleExportLucid}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors group"
                            >
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-[#06B6D4] mr-3"></div>
                                    <div>
                                        <span className="font-bold block">LucidChart (XML)</span>
                                        <span className="text-[10px] text-slate-500 font-medium italic">Importación directa</span>
                                    </div>
                                </div>
                            </button>
                            <div className="h-px bg-white/5 my-1 mx-2"></div>
                            <button
                                onClick={handleExportCsv}
                                className="w-full text-left px-4 py-3 text-sm text-[#06B6D4] hover:bg-[#06B6D4]/10 rounded-xl transition-colors group"
                            >
                                <div className="flex items-center">
                                    <FileSpreadsheet className="w-4 h-4 mr-3 text-[#06B6D4]" />
                                    <div>
                                        <span className="font-bold block">Inventario (CSV)</span>
                                        <span className="text-[10px] text-slate-500 font-medium italic">Lista de recursos y tags</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={onReset}
                className="flex items-center px-4 py-2.5 bg-red-900/10 hover:bg-red-900/30 text-red-400 hover:text-red-200 rounded-xl text-sm font-semibold transition-all border border-red-900/20"
                title="Cerrar y salir (Borrar credenciales)"
            >
                <X className="w-4 h-4 mr-2" />
                Cerrar
            </button>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative flex" onClick={() => { setIsExportMenuOpen(false); setIsTagMenuOpen(false); }}>
        {/* Inventario Lateral */}
        <div className={`relative transition-all duration-500 ease-in-out bg-[#0A0A0B] border-r border-white/5 ${isListOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
             <ResourceList 
                nodes={data.nodes} 
                isOpen={true} 
                onClose={() => setIsListOpen(false)} 
                tagKey={config.tagKey}
                tagValue={config.tagValue}
             />
        </div>

        {/* Área del Diagrama */}
        <div className="flex-1 h-full relative">
            {error && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 backdrop-blur-md text-red-100 px-6 py-3 rounded-2xl border border-red-500/50 shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-4 duration-300 max-w-lg">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[#0A0A0B]"
            minZoom={0.1}
            maxZoom={2}
            >
            <Background color="#1e293b" gap={24} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-[#0A0A0B] !border-white/10 !shadow-2xl [&_button]:!border-white/5 [&_button]:!fill-slate-300 [&_button:hover]:!bg-white/5" />
            <MiniMap 
                nodeColor={(node) => node.type === 'layer' ? 'transparent' : '#4F46E5'} 
                maskColor="rgba(10, 10, 11, 0.7)"
                className="!bg-[#0A0A0B]/80 !border-white/10 !rounded-2xl !overflow-hidden !shadow-2xl" 
            />
            </ReactFlow>
            
            <div className="absolute bottom-6 left-6 bg-[#0A0A0B]/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-2xl max-w-xs pointer-events-none z-10">
                <h3 className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">Leyenda</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[11px] text-slate-300 font-medium">
                    <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-2 shadow-sm shadow-orange-500/50"></span> Cómputo</div>
                    <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] mr-2 shadow-sm shadow-[#4F46E5]/50"></span> BD</div>
                    <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] mr-2 shadow-sm shadow-[#8B5CF6]/50"></span> Redes</div>
                    <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] mr-2 shadow-sm shadow-[#06B6D4]/50"></span> Almacén</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureViewer;
