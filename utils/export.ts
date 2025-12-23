import { getAwsIconUrl } from './awsIcons';

/**
 * Generates the XML content for the diagram.
 */
const generateXmlContent = (nodes: any[], edges: any[]) => {
  const timestamp = new Date().toISOString();
  
  // Note: compressed="false" is important for plain XML imports in some tools
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="CloudArchitect" modified="${timestamp}" agent="CloudArchitect" etag="1" version="21.0.0" type="device">
  <diagram name="AWS Architecture" id="cloud-arch-diagram">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />`;

  // 1. Generate Nodes
  nodes.forEach((node) => {
    const x = Math.round(node.position.x || 0);
    const y = Math.round(node.position.y || 0);
    const width = 80;
    const height = 80;
    
    const iconUrl = getAwsIconUrl(node.data.serviceType);
    const label = node.data.label || node.id;

    // LucidChart imports images best when style explicitly sets shape=image
    const style = `shape=image;html=1;verticalAlign=top;verticalLabelPosition=bottom;labelBackgroundColor=none;imageAspect=0;aspect=fixed;image=${iconUrl};fontColor=#333333;fontStyle=1;fontSize=11;whiteSpace=wrap;`;

    const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    xml += `
        <mxCell id="${node.id}" value="${safeLabel}" style="${style}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />
        </mxCell>`;
  });

  // 2. Generate Edges
  edges.forEach((edge) => {
    const style = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#666666;strokeWidth=1;curved=1;";
    
    xml += `
        <mxCell id="${edge.id}" value="${edge.label || ''}" style="${style}" edge="1" parent="1" source="${edge.source}" target="${edge.target}">
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

/**
 * Downloads as .drawio (Standard for Draw.io)
 */
export const downloadDrawIo = (nodes: any[], edges: any[]) => {
  const xml = generateXmlContent(nodes, edges);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  triggerDownload(blob, "aws_architecture.drawio");
};

/**
 * Downloads as .xml (Better for LucidChart "Import Documents")
 */
export const downloadLucidXml = (nodes: any[], edges: any[]) => {
  const xml = generateXmlContent(nodes, edges);
  // Using text/xml helps some browsers/importers treat it as plain XML structure
  const blob = new Blob([xml], { type: 'text/xml;charset=utf-8;' });
  triggerDownload(blob, "aws_architecture_lucid.xml");
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