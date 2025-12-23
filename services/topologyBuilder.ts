import { CloudNode, CloudEdge, ServiceTypes } from '../types';

/**
 * Normaliza y simplifica identificadores para comparación difusa.
 */
const simplifyIdentifier = (str: string): string => {
  if (!str) return '';
  // Limpiar ARNs comunes y rutas
  let clean = str.replace(/arn:aws:apigateway:[^:]+:lambda:path\/[^\/]+\/functions\//, '');
  clean = clean.replace(/arn:aws:[^:]+:[^:]+:[^:]+:/, ''); // Quitar prefijo arn básico
  
  // Quedarse con el último segmento significativo
  clean = clean.split(':').pop() || clean;
  clean = clean.split('/').pop() || clean;
  
  // Limpiar sufijos de versiones o invocaciones
  clean = clean.replace(/\/invocations$/, '').replace(/\$[^/]+$/, '');
  
  // Remover extensiones de dominio comunes para matching (ej: s3 bucket domain)
  clean = clean.replace('.s3.amazonaws.com', '');
  clean = clean.replace('.elb.amazonaws.com', '');
  
  return clean.toLowerCase().trim();
};

export const buildTopology = (nodes: CloudNode[]): CloudEdge[] => {
  const edges: CloudEdge[] = [];

  const addEdge = (sourceId: string, targetId: string, label: string = '') => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    
    // Verificar existencia
    const sourceExists = nodes.some(n => n.id === sourceId);
    const targetExists = nodes.some(n => n.id === targetId);
    
    if (!sourceExists || !targetExists) return;

    const edgeId = `e-${sourceId}-${targetId}`;
    if (!edges.find(e => e.id === edgeId)) {
      edges.push({ 
        id: edgeId, 
        source: sourceId, 
        target: targetId, 
        label: label,
        style: { stroke: '#4F46E5', strokeWidth: 2 } 
      });
    }
  };

  // Crear mapa de acceso rápido con IDs simplificados
  const nodesWithSimpleIds = nodes.map(n => ({
    ...n,
    simpleId: simplifyIdentifier(n.id),
    simpleLabel: simplifyIdentifier(n.label),
    simpleArn: n.details?.arn ? simplifyIdentifier(n.details.arn) : '',
    rawArn: n.details?.arn || ''
  }));

  // 1. CONEXIONES API GATEWAY -> LAMBDA (Usando lambdaTargets extraídos)
  const apiGateways = nodes.filter(n => n.type === 'APIGATEWAY' || n.type === 'EXECUTE-API');
  apiGateways.forEach(api => {
     if (api.details?.lambdaTargets) {
        try {
            const targets: string[] = JSON.parse(api.details.lambdaTargets);
            targets.forEach(funcName => {
                const simpleTarget = simplifyIdentifier(funcName);
                
                // Buscar la Lambda que coincida con el nombre
                const targetNode = nodesWithSimpleIds.find(n => 
                    n.type === 'LAMBDA' && (
                        n.id === funcName || 
                        n.label === funcName ||
                        n.simpleId === simpleTarget ||
                        n.simpleLabel === simpleTarget
                    )
                );

                if (targetNode) {
                    addEdge(api.id, targetNode.id, 'Invoke');
                }
            });
        } catch(e) {}
     }
  });

  // 2. CONEXIONES WAF -> RECURSOS (ALB, APIGW)
  const wafNodes = nodes.filter(n => n.type === 'WAF' || n.type === 'WAFV2');
  wafNodes.forEach(waf => {
      if (waf.details?.protectedResources) {
          try {
              const protectedArns: string[] = JSON.parse(waf.details.protectedResources);
              protectedArns.forEach(resArn => {
                  const targetNode = nodesWithSimpleIds.find(n => n.rawArn === resArn || resArn.includes(n.id));
                  if (targetNode) {
                      addEdge(waf.id, targetNode.id, 'Protects');
                  }
              });
          } catch (e) {}
      }
  });

  // 3. CONEXIONES ELB -> TARGET GROUPS -> INSTANCES
  const elbs = nodes.filter(n => n.type === 'ELB' || n.type === 'ALB' || n.type === 'NLB' || n.type === 'ELASTICLOADBALANCING');
  elbs.forEach(elb => {
      let tgNodesFound: string[] = [];
      
      if (elb.details?.elbTargetGroups) {
          try {
              const tgArns: string[] = JSON.parse(elb.details.elbTargetGroups);
              tgArns.forEach(tgArn => {
                  const tgSimple = simplifyIdentifier(tgArn);
                  const targetGroupNode = nodesWithSimpleIds.find(n => 
                      (n.rawArn && n.rawArn === tgArn) || 
                      n.simpleId === tgSimple ||
                      (n.type === 'TARGETGROUP' && tgArn.includes(n.id))
                  );
                  if (targetGroupNode) {
                      addEdge(elb.id, targetGroupNode.id, 'Route');
                      tgNodesFound.push(targetGroupNode.id);
                  }
              });
          } catch (e) {}
      }

      if (elb.details?.elbTargets) {
          try {
              const targetIds: string[] = JSON.parse(elb.details.elbTargets);
              targetIds.forEach(targetId => {
                  const targetNode = nodesWithSimpleIds.find(n => n.id === targetId || n.simpleId === simplifyIdentifier(targetId));
                  if (targetNode) {
                      if (tgNodesFound.length > 0) {
                          tgNodesFound.forEach(tgId => {
                              addEdge(tgId, targetNode.id, 'Target');
                          });
                      } else {
                          addEdge(elb.id, targetNode.id, 'Target');
                      }
                  }
              });
          } catch (e) {}
      }
  });

  // 4. CONEXIONES STEP FUNCTIONS (STATES)
  const stateMachines = nodes.filter(n => n.type === 'STATES' || n.type === 'STEPFUNCTIONS');
  stateMachines.forEach(sm => {
      if (sm.details?.stateMachineResources) {
          try {
              const resourceArns: string[] = JSON.parse(sm.details.stateMachineResources);
              resourceArns.forEach(resArn => {
                  const resSimple = simplifyIdentifier(resArn);
                  
                  // Matching más agresivo: buscar por nombre de función exacto o ARN parcial
                  const targetNode = nodesWithSimpleIds.find(n => 
                    (n.rawArn && n.rawArn === resArn) || // ARN Exacto
                    n.simpleId === resSimple || // ID/Nombre simplificado (lowercase)
                    n.simpleLabel === resSimple || // Label simplificado
                    resArn.includes(n.id) || // ID contenido en el ARN del recurso
                    (n.details?.arn && resArn.includes(n.details.arn)) // ARN del nodo contenido en el recurso
                  );
                  
                  if (targetNode) {
                      addEdge(sm.id, targetNode.id, 'Task');
                  }
              });
          } catch (e) {
              console.error("Error topology state machine", e);
          }
      }
  });

  // 5. CONEXIONES CLOUDFRONT (ORIGINS)
  const distributions = nodes.filter(n => n.type === 'CLOUDFRONT');
  distributions.forEach(dist => {
      if (dist.details?.cloudfrontOrigins) {
          try {
              const origins: string[] = JSON.parse(dist.details.cloudfrontOrigins);
              origins.forEach(originDomain => {
                  const originSimple = simplifyIdentifier(originDomain);
                  
                  // Buscar el nodo destino basado en el dominio
                  const targetNode = nodesWithSimpleIds.find(n => {
                      // Caso S3: origin "my-bucket.s3..." vs bucket name "my-bucket"
                      if (n.type === 'S3' && (originDomain.startsWith(n.label) || originDomain.startsWith(n.id))) return true;
                      
                      // Caso ELB: origin "my-alb-123..." vs alb name "my-alb"
                      // A veces el ELB name es parte del DNS
                      if ((n.type === 'ELB' || n.type === 'ALB') && originDomain.includes(n.simpleLabel)) return true;
                      
                      // Caso API Gateway
                      if (n.type.includes('API') && originDomain.includes(n.id)) return true;

                      // Fallback genérico
                      return n.simpleId === originSimple;
                  });

                  if (targetNode) {
                      addEdge(dist.id, targetNode.id, 'Origin');
                  }
              });
          } catch (e) {}
      }
  });

  // 6. CONEXIONES POR VARIABLES DE ENTORNO (Lambdas)
  const lambdas = nodes.filter(n => n.type === ServiceTypes.LAMBDA);
  lambdas.forEach(lambda => {
    if (lambda.details?.envVars) {
      try {
        const envs = JSON.parse(lambda.details.envVars);
        Object.values(envs).forEach((val: any) => {
          const valStr = String(val);
          if (valStr.length < 5) return;
          const simpleVal = simplifyIdentifier(valStr);
          const targets = nodesWithSimpleIds.filter(n => 
            n.id !== lambda.id && (
              valStr.includes(n.id) || 
              (n.rawArn && valStr.includes(n.rawArn)) ||
              (n.simpleLabel && valStr.toLowerCase().includes(n.simpleLabel) && n.simpleLabel.length > 5) ||
              n.simpleId === simpleVal
            )
          );
          targets.forEach(t => addEdge(lambda.id, t.id, 'Ref. Env'));
        });
      } catch (e) {}
    }
  });

  return edges;
};