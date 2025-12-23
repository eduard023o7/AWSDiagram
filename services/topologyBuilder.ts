import { CloudNode, CloudEdge, ServiceType } from '../types';

export const buildTopology = (nodes: CloudNode[]): CloudEdge[] => {
  const edges: CloudEdge[] = [];
  
  // Group nodes for faster lookup
  const nodeMap = new Map<string, CloudNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));
  
  const lambdas = nodes.filter(n => n.type === ServiceType.LAMBDA);
  const otherNodes = nodes.filter(n => n.type !== ServiceType.LAMBDA);

  // Helper to add edge
  const addEdge = (sourceId: string, targetId: string, label: string = '') => {
    if (sourceId === targetId) return;
    // Check if both nodes exist in our universe
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) return;

    const edgeId = `e-${sourceId}-${targetId}`;
    if (!edges.find(e => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        label: label,
        // Make "Real" connections distinct
        style: label ? { stroke: '#3b82f6', strokeWidth: 2 } : undefined
      });
    }
  };

  // --- A. REAL CONNECTION LOGIC (Deep Inspection) ---

  lambdas.forEach(lambda => {
      // 1. Check Event Source Mappings (Triggers)
      if (lambda.details?.triggers) {
          const triggers = lambda.details.triggers.split(',');
          triggers.forEach(triggerArn => {
              // Try to find the node matching this trigger ARN
              // We need to match ARN to ID logic used in awsService
              const triggerIdParts = triggerArn.split(':');
              const triggerId = triggerIdParts[triggerIdParts.length - 1].split('/').pop() || '';
              
              // Find matching node by ID or ARN check
              const sourceNode = nodes.find(n => n.details?.arn === triggerArn || n.id === triggerId || triggerArn.includes(n.id));
              
              if (sourceNode) {
                  addEdge(sourceNode.id, lambda.id, 'Trigger');
              }
          });
      }

      // 2. Check Environment Variables
      if (lambda.details?.envVars) {
          try {
              const envs = JSON.parse(lambda.details.envVars) as Record<string, string>;
              Object.entries(envs).forEach(([key, value]) => {
                  const valStr = String(value);
                  // Iterate over other nodes to see if this value references them
                  otherNodes.forEach(target => {
                      // Check for ID match, Name match, or ARN match inside the Env Var value
                      const isMatch = valStr.includes(target.id) || 
                                      (target.label.length > 3 && valStr.includes(target.label)) ||
                                      (target.details?.arn && valStr.includes(target.details.arn));
                      
                      if (isMatch) {
                          addEdge(lambda.id, target.id, key); // Label edge with Env Var Name
                      }
                  });
              });
          } catch (e) {
              // ignore parse error
          }
      }
  });


  // --- B. HEURISTIC CONNECTION LOGIC (Fallback) ---
  // We keep this for layers where we didn't do deep inspection (like ELB -> EC2 for now, or if no Env Vars found)
  
  const loadBalancers = nodes.filter(n => n.type === ServiceType.LOAD_BALANCER);
  const ec2Instances = nodes.filter(n => n.type === ServiceType.EC2);
  const apiGateways = nodes.filter(n => n.type === ServiceType.API_GATEWAY);
  const databases = nodes.filter(n => n.type === ServiceType.RDS || n.type === ServiceType.DYNAMODB);

  // LB -> EC2 (Standard fallback)
  loadBalancers.forEach(lb => {
    ec2Instances.forEach(ec2 => {
       // Only add if no existing edge
       if(!edges.some(e => (e.source === lb.id && e.target === ec2.id))) {
           addEdge(lb.id, ec2.id); 
       }
    });
  });

  // API Gateway -> Lambda
  apiGateways.forEach(api => {
    lambdas.forEach(lambda => {
        if(!edges.some(e => (e.source === api.id && e.target === lambda.id))) {
             addEdge(api.id, lambda.id);
        }
    });
  });

  // Default Compute -> Data (Only if NO real connections found for this compute node)
  const computeNodes = [...ec2Instances, ...lambdas];
  computeNodes.forEach(compute => {
      // Check if this compute node already has connections
      const hasRealConnections = edges.some(e => e.source === compute.id || e.target === compute.id);
      
      if (!hasRealConnections) {
          databases.forEach(db => {
             addEdge(compute.id, db.id);
          });
      }
  });

  return edges;
};