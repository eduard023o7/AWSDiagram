import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;

// Definición de constantes de Capas para uso compartido
export const TIER_HEIGHT = 300; // Altura de cada banda
export const TIERS = {
  SECURITY: 0,
  EDGE: 1,
  DELIVERY: 2,
  COMPUTE: 3,
  INTEGRATION: 4,
  DATA: 5,
  GOVERNANCE: 6
};

export const TIER_LABELS: Record<number, string> = {
  [TIERS.SECURITY]: "Security Perimeter (WAF / Shield)",
  [TIERS.EDGE]: "Edge & Network Public",
  [TIERS.DELIVERY]: "Entry Point / Load Balancing",
  [TIERS.COMPUTE]: "Compute / Backend / Microservices",
  [TIERS.INTEGRATION]: "Async Integration & Messaging",
  [TIERS.DATA]: "Data Persistence & Storage",
  [TIERS.GOVERNANCE]: "Management & Governance"
};

// Definición de Capas (Tiers)
const getServiceTier = (type: string): number => {
  const t = type.toUpperCase();

  // Tier 0: Security (New Layer)
  if (t === 'WAF' || t === 'WAFV2' || t === 'SHIELD' || t === 'NETWORK-FIREWALL' || t === 'GUARDDUTY' || t === 'INSPECTOR' || t === 'MACIE') return TIERS.SECURITY;
  
  // Tier 1: Edge / Public
  if (t === 'CLOUDFRONT' || t === 'ROUTE53' || t === 'INTERNETGATEWAY' || t === 'TRANSITGATEWAY' || t === 'GLOBALACCELERATOR') return TIERS.EDGE;
  
  // Tier 2: Networking Entry / Load Balancing / API
  if (t.includes('API') || t === 'ELB' || t === 'ALB' || t === 'NLB' || t === 'ELASTICLOADBALANCING' || t === 'TARGETGROUP') return TIERS.DELIVERY;
  
  // Tier 3: Compute / Backend
  if (t === 'LAMBDA' || t === 'EC2' || t === 'ECS' || t === 'EKS' || t === 'FARGATE' || t === 'STATES' || t === 'STEPFUNCTIONS' || t === 'BATCH') return TIERS.COMPUTE;

  // Tier 4: Integration / Async
  if (t === 'SQS' || t === 'SNS' || t === 'EVENTBRIDGE' || t === 'EVENTS' || t === 'KINESIS' || t === 'MQ') return TIERS.INTEGRATION;

  // Tier 5: Data / Storage
  if (t === 'RDS' || t === 'DYNAMODB' || t === 'S3' || t === 'ELASTICACHE' || t === 'DOCDB' || t === 'REDSHIFT' || t === 'AURORA' || t === 'EFS') return TIERS.DATA;

  // Tier 6: Governance / Management
  if (t === 'CLOUDWATCH' || t === 'LOGS' || t === 'IAM' || t === 'KMS' || t === 'SECRETSMANAGER' || t === 'CLOUDFORMATION' || t === 'CONFIG' || t === 'COGNITO' || t === 'COGNITO-IDP') return TIERS.GOVERNANCE;

  return TIERS.COMPUTE; // Default
};

export const getLayoutedElements = (
  nodes: Node[], 
  edges: Edge[], 
  direction = 'TB',
  spacing: 'compact' | 'expanded' = 'expanded'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Aumentamos el ranksep para dar aire entre capas visuales
  const rankSep = spacing === 'expanded' ? 150 : 100;
  const nodeSep = spacing === 'expanded' ? 100 : 50;

  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    align: 'UL' 
  });

  nodes.forEach((node) => {
    // Si es un nodo de capa (layer visual), lo ignoramos para el layout de dagre
    if (node.type === 'layer') return;
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    if (node.type === 'layer') return node; // No tocamos los nodos de capa aquí, se calculan fuera

    const dagrePos = dagreGraph.node(node.id);
    // Fallback por si dagre no tiene el nodo (ej: nodo aislado raro)
    if (!dagrePos) return node;

    const tier = getServiceTier(node.data.serviceType);
    
    // Forzar posición Y basada en la capa estricta
    // Añadimos un pequeño desplazamiento aleatorio en Y para evitar lineas rectas perfectas si hay muchos nodos
    const jitter = (node.id.charCodeAt(0) % 10) * 2;
    const yPos = (tier * TIER_HEIGHT) + (TIER_HEIGHT / 2) - (NODE_HEIGHT / 2) + jitter;

    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: dagrePos.x - NODE_WIDTH / 2,
        y: yPos,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};