import { CloudNode, CloudEdge, ServiceTypes } from '../types';

export const buildTopology = (nodes: CloudNode[]): CloudEdge[] => {
  const edges: CloudEdge[] = [];
  
  // Group nodes for faster lookup
  const nodeMap = new Map<string, CloudNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));
  
  // Helper to safely check type
  const isType = (n: CloudNode, type: string) => n.type.toUpperCase() === type;
  const isTypeIncludes = (n: CloudNode, partial: string) => n.type.toUpperCase().includes(partial);

  const lambdas = nodes.filter(n => isType(n, ServiceTypes.LAMBDA));
  const otherNodes = nodes.filter(n => !isType(n, ServiceTypes.LAMBDA));

  // Helper to add edge
  const addEdge = (sourceId: string, targetId: string, label: string = '') => {
    if (sourceId === targetId) return;
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) return;

    const edgeId = `e-${sourceId}-${targetId}`;
    if (!edges.find(e => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        label: label,
        style: label ? { stroke: '#3b82f6', strokeWidth: 2 } : undefined
      });
    }
  };

  // --- A. DEEP INSPECTION LOGIC (Real Config) ---

  // 1. Step Functions & SNS (Linked Resources via Deep Inspection)
  const nodesWithLinks = nodes.filter(n => n.details?.linkedResources);
  nodesWithLinks.forEach(node => {
      try {
          const links = JSON.parse(node.details?.linkedResources || '[]');
          links.forEach((linkStr: string) => {
              
              // 1. Strict ARN or Full Match
              let targetNode = nodes.find(n => 
                  n.details?.arn === linkStr || 
                  linkStr === n.details?.arn
              );

              // 2. Fuzzy / Partial Match (e.g. ASL contains "MyFunction", Node is "prod-MyFunction-v1")
              if (!targetNode && !linkStr.startsWith('arn:')) {
                  // Try to find if the linkStr is contained within the Label or ID
                  targetNode = nodes.find(n => 
                      n.id.includes(linkStr) || 
                      n.label.includes(linkStr) ||
                      linkStr.includes(n.id) // Inverse check
                  );
              }

              // 3. Extracted Name from ARN Match
              // If linkStr is an ARN, extract the ID and try to match
              if (!targetNode && linkStr.startsWith('arn:')) {
                  const parts = linkStr.split(':');
                  const name = parts[parts.length - 1]; // "function-name"
                  targetNode = nodes.find(n => n.id === name || n.label === name || n.details?.arn === linkStr);
              }

              if (targetNode) {
                  let label = 'Invokes';
                  if (node.type === 'SNS') label = 'Subscribes';
                  addEdge(node.id, targetNode.id, label);
              }
          });
      } catch (e) {
          // ignore parsing error
      }
  });


  // 2. Lambda Triggers (Event Source Mappings)
  lambdas.forEach(lambda => {
      if (lambda.details?.triggers) {
          const triggers = lambda.details.triggers.split(',');
          triggers.forEach(triggerArn => {
              const triggerIdParts = triggerArn.split(':');
              const triggerId = triggerIdParts[triggerIdParts.length - 1].split('/').pop() || '';
              
              const sourceNode = nodes.find(n => n.details?.arn === triggerArn || n.id === triggerId || triggerArn.includes(n.id));
              
              if (sourceNode) {
                  addEdge(sourceNode.id, lambda.id, 'Trigger');
              }
          });
      }

      // 3. Lambda Environment Variables (Heuristic scan)
      if (lambda.details?.envVars) {
          try {
              const envs = JSON.parse(lambda.details.envVars) as Record<string, string>;
              Object.entries(envs).forEach(([key, value]) => {
                  const valStr = String(value);
                  otherNodes.forEach(target => {
                      const isMatch = valStr.includes(target.id) || 
                                      (target.label.length > 3 && valStr.includes(target.label)) ||
                                      (target.details?.arn && valStr.includes(target.details.arn));
                      
                      if (isMatch) {
                          addEdge(lambda.id, target.id, key); 
                      }
                  });
              });
          } catch (e) { }
      }
  });

  // --- B. GENERIC FALLBACK LOGIC ---
  
  const loadBalancers = nodes.filter(n => isType(n, 'ELB') || isType(n, 'ELASTICLOADBALANCING'));
  const ec2Instances = nodes.filter(n => isType(n, ServiceTypes.EC2));
  const apiGateways = nodes.filter(n => isTypeIncludes(n, 'API') || isTypeIncludes(n, 'GATEWAY'));
  const databases = nodes.filter(n => isType(n, ServiceTypes.RDS) || isType(n, ServiceTypes.DYNAMODB));
  const s3Buckets = nodes.filter(n => isType(n, ServiceTypes.S3));
  
  // New Categories
  const cloudFronts = nodes.filter(n => isType(n, 'CLOUDFRONT'));
  const cognitoPools = nodes.filter(n => isTypeIncludes(n, 'COGNITO'));

  // CloudFront -> S3 or ELB or API Gateway
  cloudFronts.forEach(cf => {
      if (s3Buckets.length > 0) addEdge(cf.id, s3Buckets[0].id, 'Origin?'); 
      if (loadBalancers.length > 0) addEdge(cf.id, loadBalancers[0].id, 'Origin?');
      if (apiGateways.length > 0) addEdge(cf.id, apiGateways[0].id, 'Origin?');
  });

  // Cognito -> API Gateway (Authorizer) or ELB
  cognitoPools.forEach(cog => {
      apiGateways.forEach(api => addEdge(cog.id, api.id, 'Auth'));
      loadBalancers.forEach(lb => addEdge(cog.id, lb.id, 'Auth'));
  });

  // LB -> EC2 (If no target groups found logic added later, keep fallback)
  loadBalancers.forEach(lb => {
    ec2Instances.forEach(ec2 => {
       if(!edges.some(e => (e.source === lb.id && e.target === ec2.id))) {
           addEdge(lb.id, ec2.id); 
       }
    });
  });

  // API Gateway -> Lambda (Fallback if no integration found)
  apiGateways.forEach(api => {
    lambdas.forEach(lambda => {
        if(!edges.some(e => (e.source === api.id && e.target === lambda.id))) {
             addEdge(api.id, lambda.id);
        }
    });
  });

  // Compute -> Data (Fallback)
  const computeNodes = [...ec2Instances, ...lambdas];
  computeNodes.forEach(compute => {
      const hasRealConnections = edges.some(e => e.source === compute.id || e.target === compute.id);
      
      if (!hasRealConnections) {
          databases.forEach(db => addEdge(compute.id, db.id));
      }
  });

  return edges;
};