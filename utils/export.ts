import { CloudNode, CloudEdge } from '../types';

/**
 * Generates a CSV blob that represents the graph.
 * Lucidchart allows importing CSV data to build diagrams.
 * Format: ID, Name, Shape, ...Connections
 */
export const downloadCSV = (nodes: CloudNode[], edges: CloudEdge[]) => {
  const headers = ['Id', 'Label', 'Type', 'ParentId', 'ConnectedTo'];
  
  const rows = nodes.map(node => {
    // Find all targets this node connects to
    const connections = edges
      .filter(e => e.source === node.id)
      .map(e => e.target)
      .join(';');

    return [
      node.id,
      `"${node.label}"`, // Quote to handle commas
      node.type,
      node.parentId || '',
      connections
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "architecture_diagram.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
