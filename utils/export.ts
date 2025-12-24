import { getAwsIconUrl } from './awsIcons';

// Helper to map Layer names to Draw.io Hex styles
const getLayerStyles = (label: string): { fill: string; stroke: string; font: string } => {
  const l = label.toLowerCase();
  
  if (l.includes('edge') || l.includes('public')) 
    return { fill: '#3b0764', stroke: '#a855f7', font: '#d8b4fe' };

  if (l.includes('entry') || l.includes('load')) 
    return { fill: '#312e81', stroke: '#6366f1', font: '#a5b4fc' };

  if (l.includes('compute') || l.includes('backend')) 
    return { fill: '#431407', stroke: '#f97316', font: '#fdba74' };

  if (l.includes('integration') || l.includes('async')) 
    return { fill: '#500724', stroke: '#ec4899', font: '#f9a8d4' };

  if (l.includes('data') || l.includes('persistence')) 
    return { fill: '#172554', stroke: '#3b82f6', font: '#93c5fd' };

  if (l.includes('governance') || l.includes('security')) 
    return { fill: '#1e293b', stroke: '#64748b', font: '#cbd5e1' };

  return { fill: '#18181b', stroke: '#3f3f46', font: '#a1a1aa' };
};

// CRITICAL: Robust XML escaping function
const escapeXml = (unsafe: string): string => {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
    return c;
  });
};

const generateXmlContent = (nodes: any[], edges: any[]) => {
  const timestamp = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="CloudArchitect" modified="${timestamp}" agent="CloudArchitect" etag="1" version="21.0.0" type="device">
  <diagram name="AWS Architecture" id="cloud-arch-diagram">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />`;

  // Sort: Layers first (background), Resources last (foreground)
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.type === 'layer' && b.type !== 'layer') return -1;
    if (a.type !== 'layer' && b.type === 'layer') return 1;
    return 0;
  });

  sortedNodes.forEach((node) => {
    const x = Math.round(node.position.x || 0);
    const y = Math.round(node.position.y || 0);
    
    // Default dimensions if not present
    let width = node.width || 240; 
    let height = node.height || 120;
    
    let style = '';
    let rawValue = ''; // Content that needs to be escaped

    if (node.type === 'layer') {
        const layerColors = getLayerStyles(node.data.label);
        
        // Parse width/height from style if available (typical for ReactFlow resized nodes)
        if (node.style?.width) width = parseInt(String(node.style.width), 10);
        if (node.style?.height) height = parseInt(String(node.style.height), 10);
        
        // HTML Title for Layer
        rawValue = `<h3 style="margin:0; padding:4px; text-transform:uppercase; letter-spacing:1px; font-family:Helvetica; font-size:12px; color:${layerColors.font}">${node.data.label}</h3>`;
        
        // Rect Container Style
        style = `html=1;whiteSpace=wrap;shape=mxgraph.basic.rect;fillColor=${layerColors.fill};strokeColor=${layerColors.stroke};strokeWidth=2;dashed=1;verticalAlign=top;align=left;spacingLeft=10;fillOpacity=60;`;
    
    } else {
        const iconUrl = getAwsIconUrl(node.data.serviceType);
        const label = node.data.label || node.id;
        rawValue = label; // Just the text label
        
        // Image Style
        // Note: html=1 allows text wrapping. 
        style = `shape=image;html=1;verticalAlign=top;verticalLabelPosition=bottom;labelBackgroundColor=none;imageAspect=0;aspect=fixed;image=${iconUrl};fontColor=#9CA3AF;fontFamily=Helvetica;fontSize=11;fontStyle=1;whiteSpace=wrap;`;
    }

    // Fix: Properly escape the content for XML attribute
    const escapedValue = escapeXml(rawValue);

    xml += `
        <mxCell id="${node.id}" value="${escapedValue}" style="${style}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />
        </mxCell>`;
  });

  edges.forEach((edge) => {
    const style = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4F46E5;strokeWidth=2;curved=1;";
    const escapedLabel = escapeXml(edge.label || '');
    
    xml += `
        <mxCell id="${edge.id}" value="${escapedLabel}" style="${style}" edge="1" parent="1" source="${edge.source}" target="${edge.target}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;
  });

  xml += `
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  
  return xml;
};

export const downloadResourceCsv = (nodes: any[]) => {
    const header = "Nombre,ID,Tipo,ARN,Etiquetas\n";
    const rows = nodes.filter(n => n.type !== 'layer').map(node => {
        const d = node.data;
        const details = d.details || {};
        const tags = Object.entries(details)
            .filter(([k]) => k !== 'arn' && k !== 'linkedResources' && k !== 'envVars')
            .map(([k, v]) => `${k}=${v}`)
            .join(' | ');
            
        return `"${d.label}","${node.id}","${d.serviceType}","${details.arn || ''}","${tags}"`;
    }).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, "aws_resource_inventory.csv");
};

export const downloadDrawIo = (nodes: any[], edges: any[]) => {
  const xml = generateXmlContent(nodes, edges);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  triggerDownload(blob, "aws_architecture.drawio");
};

const triggerDownload = (blob: Blob, filename: string) => {
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};