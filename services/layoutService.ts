import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

export const getLayoutedElements = (
  nodes: Node[], 
  edges: Edge[], 
  direction = 'TB',
  spacing: 'compact' | 'expanded' = 'expanded'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Adjust spacing based on mode
  const rankSep = spacing === 'expanded' ? 150 : 80;
  const nodeSep = spacing === 'expanded' ? 100 : 50;

  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches React Flow's anchor point
    return {
      ...node,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};