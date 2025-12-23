import { ArchitectureData, CloudNode, ServiceTypes } from '../types';
import { buildTopology } from './topologyBuilder';

const getServiceTypeFromArn = (arn: string): string => {
  if (!arn) return 'UNKNOWN';
  const parts = arn.split(':');
  if (parts.length < 3) return 'UNKNOWN';
  let service = parts[2].toUpperCase(); 
  if (service === 'EC2') {
    if (arn.includes('vpc')) return 'VPC';
    if (arn.includes('security-group')) return 'SECURITY-GROUP';
    if (arn.includes('subnet')) return 'SUBNET';
    return 'EC2';
  }
  if (service === 'ELASTICLOADBALANCING') {
      if (arn.includes('targetgroup')) return 'TARGETGROUP';
      return 'ELB';
  }
  return service;
};

const extractIdFromArn = (arn: string): string => {
  const parts = arn.split(':');
  const lastPart = parts[parts.length - 1];
  if (lastPart.includes('/')) return lastPart.split('/').pop() || lastPart;
  return lastPart;
};

const isHighValueArchitectureResource = (arn: string): boolean => {
  if (!arn) return false;

  // 1. Exclusiones de Almacenamiento y Copias de Seguridad
  if (arn.includes(':snapshot')) return false; 
  if (arn.includes('snapshot/')) return false;
  if (arn.includes(':cluster-snapshot:')) return false; 
  if (arn.includes(':image/')) return false;          
  if (arn.includes(':volume/')) return false;         
  if (arn.includes(':backup-vault/')) return false;   

  // 2. Exclusiones de Red y Fontanería
  if (arn.includes(':network-interface/')) return false; 
  if (arn.includes(':security-group/')) return false;    
  if (arn.includes(':subnet/')) return false;            
  if (arn.includes(':listener/')) return false;          
  if (arn.includes(':listener-rule/')) return false;     
  if (arn.includes(':route-table/')) return false;       
  if (arn.includes(':internet-gateway/')) return false;  
  if (arn.includes(':dhcp-options/')) return false;
  
  // 3. Exclusiones de Cómputo y Versiones
  if (arn.includes(':layer:')) return false;             
  if (arn.includes(':task-definition/')) return false;   
  if (arn.includes(':deployment/')) return false;        
  if (arn.includes(':stage/')) return false;             
  if (arn.includes(':launch-template/')) return false;   

  // 4. Exclusiones de Identidad y Monitoreo
  if (arn.includes(':policy/')) return false;            
  if (arn.includes(':role/')) return false;              
  if (arn.includes(':alarm:')) return false;             
  if (arn.includes(':event-rule/')) return false;        
  if (arn.includes(':alias/')) return false;             

  // 5. Lógica específica para Lambda
  if (arn.includes(':function:')) {
      const parts = arn.split(':');
      const lastPart = parts[parts.length - 1];
      if (/^[0-9]+$/.test(lastPart)) return false; 
  }

  return true;
};

// --- Signature V4 logic ---
const encoder = new TextEncoder();
async function hmac(key: ArrayBuffer | CryptoKey, data: string): Promise<ArrayBuffer> {
    const importedKey = key instanceof CryptoKey ? key : await crypto.subtle.importKey("raw", key as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return crypto.subtle.sign("HMAC", importedKey, encoder.encode(data));
}
async function hashSHA256(data: string): Promise<string> {
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
    const kSecret = encoder.encode("AWS4" + key);
    const kDate = await hmac(kSecret, dateStamp);
    const kRegion = await hmac(kDate, regionName);
    const kService = await hmac(kRegion, serviceName);
    const kSigning = await hmac(kService, "aws4_request");
    return kSigning;
}

interface AwsRequestConfig {
    accessKey: string; secretKey: string; region: string; service: string; host: string; path: string;
    method: string; body: string; headers: Record<string, string>; query?: Record<string, string>;
    contentType?: string;
}

async function fetchAws(config: AwsRequestConfig) {
    const { accessKey, secretKey, region, service, host, path, method, body, headers, query, contentType } = config;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    let canonicalQuerystring = "";
    if (query) {
        canonicalQuerystring = Object.keys(query).sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&');
    }
    const baseHeaders: Record<string, string> = { ...headers, "Host": host, "X-Amz-Date": amzDate };
    
    if (contentType) {
        baseHeaders["Content-Type"] = contentType;
    } else if (body && !baseHeaders["Content-Type"]) {
        baseHeaders["Content-Type"] = "application/x-amz-json-1.1";
    }
    
    const canonicalHeadersObj: Record<string, string> = {};
    Object.keys(baseHeaders).forEach(key => { canonicalHeadersObj[key.toLowerCase()] = String(baseHeaders[key]).trim().replace(/\s+/g, ' '); });
    const sortedSignedHeadersKeys = Object.keys(canonicalHeadersObj).sort();
    let canonicalHeadersStr = "";
    let signedHeadersStr = "";
    sortedSignedHeadersKeys.forEach(key => { canonicalHeadersStr += `${key}:${canonicalHeadersObj[key]}\n`; signedHeadersStr += signedHeadersStr.length > 0 ? `;${key}` : key; });
    
    const payloadHash = await hashSHA256(body || "");
    const canonicalRequest = `${method}\n${path}\n${canonicalQuerystring}\n${canonicalHeadersStr}\n${signedHeadersStr}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await hashSHA256(canonicalRequest)}`;
    const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
    const signatureBuffer = await hmac(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;
    const fetchHeaders: Record<string, string> = { ...baseHeaders, "Authorization": authorizationHeader };
    delete fetchHeaders['Host'];
    const url = `https://${host}${path}${canonicalQuerystring ? '?' + canonicalQuerystring : ''}`;
    return fetch(url, { method: method, headers: fetchHeaders, body: body || undefined });
}

// --- Deep Discovery ---

const enrichNodesWithDeepInspection = async (
    nodes: CloudNode[], accessKey: string, secretKey: string, region: string
): Promise<CloudNode[]> => {
    const enrichedNodes = [...nodes];
    
    // 1. Inspección de API Gateway
    const apiNodes = enrichedNodes.filter(n => n.type === 'APIGATEWAY' || n.type === 'EXECUTE-API');
    const apiPromise = Promise.all(apiNodes.map(async (node) => {
        try {
            const apiId = node.id;
            let response = await fetchAws({
                accessKey, secretKey, region, service: 'apigateway', host: `apigateway.${region}.amazonaws.com`,
                path: `/v2/apis/${apiId}/integrations`, method: 'GET', body: '', headers: {}
            });
            if (!response.ok) {
                 response = await fetchAws({
                    accessKey, secretKey, region, service: 'apigateway', host: `apigateway.${region}.amazonaws.com`,
                    path: `/restapis/${apiId}/resources`, method: 'GET', body: '', headers: { "Accept": "application/json" }
                });
                if (response.ok) {
                    const data = await response.json();
                    const rawJson = JSON.stringify(data);
                    const links = rawJson.match(/arn:aws:lambda:[a-z0-9-]+:[0-9]+:function:[a-zA-Z0-9-_]+/g) || [];
                    if (links.length > 0) {
                        node.details = { ...node.details, linkedResources: JSON.stringify([...new Set(links)]) };
                    }
                }
            } else {
                const data = await response.json();
                const items = data.Items || [];
                const links = items.map((item: any) => item.IntegrationUri).filter(Boolean);
                if (links.length > 0) {
                    node.details = { ...node.details, linkedResources: JSON.stringify(links) };
                }
            }
        } catch (e) {
            console.warn(`Fallo al inspeccionar API ${node.id}`, e);
        }
    }));

    // 2. Inspección de Lambda
    const lambdaNodes = enrichedNodes.filter(n => n.type === ServiceTypes.LAMBDA);
    const lambdaPromise = Promise.all(lambdaNodes.map(async (node) => {
      try {
          const lambdaName = node.label || node.id;
          const configResponse = await fetchAws({
              accessKey, secretKey, region, service: 'lambda', host: `lambda.${region}.amazonaws.com`,
              path: `/2015-03-31/functions/${lambdaName}/configuration`, method: 'GET', body: '', headers: {}
          });
          if (configResponse.ok) {
              const data = await configResponse.json();
              if (data.Environment?.Variables) {
                  node.details = { ...node.details, envVars: JSON.stringify(data.Environment.Variables) };
              }
          }
      } catch (e) {}
    }));

    // 3. Inspección de ELB
    const elbNodes = enrichedNodes.filter(n => n.type === 'ELB' || n.type === 'ALB' || n.type === 'NLB');
    const elbPromise = Promise.all(elbNodes.map(async (node) => {
        try {
            const params = new URLSearchParams();
            params.append('Action', 'DescribeTargetGroups');
            params.append('LoadBalancerArn', node.details?.arn || '');
            params.append('Version', '2015-12-01');

            const tgResponse = await fetchAws({
                accessKey, secretKey, region, service: 'elasticloadbalancing', host: `elasticloadbalancing.${region}.amazonaws.com`,
                path: '/', method: 'POST', body: params.toString(), headers: {}, contentType: 'application/x-www-form-urlencoded'
            });

            if (tgResponse.ok) {
                const xmlText = await tgResponse.text();
                const tgArns = xmlText.match(/<TargetGroupArn>(.*?)<\/TargetGroupArn>/g)?.map(t => t.replace(/<\/?TargetGroupArn>/g, '')) || [];
                if (tgArns.length > 0) {
                    const targetsFound: string[] = [];
                    await Promise.all(tgArns.map(async (tgArn) => {
                         const healthParams = new URLSearchParams();
                         healthParams.append('Action', 'DescribeTargetHealth');
                         healthParams.append('TargetGroupArn', tgArn);
                         healthParams.append('Version', '2015-12-01');
                         const healthResponse = await fetchAws({
                            accessKey, secretKey, region, service: 'elasticloadbalancing', host: `elasticloadbalancing.${region}.amazonaws.com`,
                            path: '/', method: 'POST', body: healthParams.toString(), headers: {}, contentType: 'application/x-www-form-urlencoded'
                         });
                         if (healthResponse.ok) {
                             const healthXml = await healthResponse.text();
                             const ids = healthXml.match(/<Id>(.*?)<\/Id>/g)?.map(t => t.replace(/<\/?Id>/g, '')) || [];
                             targetsFound.push(...ids);
                         }
                    }));
                    node.details = { ...node.details, elbTargetGroups: JSON.stringify(tgArns), elbTargets: JSON.stringify([...new Set(targetsFound)]) };
                }
            }
        } catch (e) {
            console.warn(`Fallo al inspeccionar ELB ${node.id}`, e);
        }
    }));

    // 4. Inspección de Step Functions (States) - Regex mejorado
    const stateNodes = enrichedNodes.filter(n => n.type === 'STATES' || n.type === 'STEPFUNCTIONS');
    const statePromise = Promise.all(stateNodes.map(async (node) => {
        try {
            const stateMachineArn = node.details?.arn || '';
            const payload = { stateMachineArn };
            const response = await fetchAws({
                accessKey, secretKey, region, service: 'states', host: `states.${region}.amazonaws.com`,
                path: '/', method: 'POST', body: JSON.stringify(payload), 
                headers: { "X-Amz-Target": "AWSStepFunctions.DescribeStateMachine" }
            });

            if (response.ok) {
                const data = await response.json();
                const definition = data.definition; // JSON String
                
                // Buscar CUALQUIER ARN de Lambda. 
                // Patrón general: arn:aws:lambda:region:account:function:name
                const lambdaArns = definition.match(/arn:aws:lambda:[a-z0-9-]+:[0-9]+:function:[a-zA-Z0-9-_]+/g);
                
                // Fallback: Buscar por clave "Resource" si el ARN está truncado o diferente
                const resourceMatches = definition.match(/"Resource":\s*"([^"]+)"/g)?.map((s: string) => s.split('"')[3]) || [];
                const explicitLambdaArns = resourceMatches.filter((r: string) => r.includes(':lambda:'));

                const allArns = [...new Set([...(lambdaArns || []), ...explicitLambdaArns])];
                
                if (allArns.length > 0) {
                    node.details = { ...node.details, stateMachineResources: JSON.stringify(allArns) };
                }
            }
        } catch (e) {
             console.warn(`Fallo al inspeccionar State Machine ${node.id}`, e);
        }
    }));

    await Promise.all([apiPromise, lambdaPromise, elbPromise, statePromise]);
    return enrichedNodes;
};

export const fetchAwsResources = async (
  accessKeyId: string, secretAccessKey: string, region: string, tagKey: string, tagValue: string
): Promise<ArchitectureData> => {
    const nodes: CloudNode[] = [];
    let paginationToken: string | undefined = undefined;
    try {
        do {
            const payload: any = { TagFilters: [ { Key: tagKey, Values: [tagValue] } ], ResourcesPerPage: 50 };
            if (paginationToken && paginationToken.length > 0) payload.PaginationToken = paginationToken;
            const response = await fetchAws({
                accessKey: accessKeyId, secretKey: secretAccessKey, region: region, 
                service: "tagging", host: `tagging.${region}.amazonaws.com`,
                path: "/", method: "POST", body: JSON.stringify(payload), 
                headers: { "X-Amz-Target": "ResourceGroupsTaggingAPI_20170126.GetResources" }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AWS Tagging API Error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            paginationToken = data.PaginationToken;
            if (data.ResourceTagMappingList) {
                data.ResourceTagMappingList.forEach((resource: any) => {
                    const arn = resource.ResourceARN || '';
                    if (!isHighValueArchitectureResource(arn)) return; 
                    const tags: Record<string, string> = {};
                    if (Array.isArray(resource.Tags)) resource.Tags.forEach((t: any) => { if (t.Key && t.Value) tags[t.Key] = t.Value; });
                    nodes.push({ 
                      id: extractIdFromArn(arn), 
                      label: tags['Name'] || tags['name'] || extractIdFromArn(arn), 
                      type: getServiceTypeFromArn(arn), 
                      details: { ...tags, arn: arn } 
                    });
                });
            }
        } while (paginationToken && paginationToken.length > 0);
        if (nodes.length > 0) await enrichNodesWithDeepInspection(nodes, accessKeyId, secretAccessKey, region);
    } catch (error: any) { 
        console.error("Fetch AWS Resources Failed:", error);
        throw error; 
    }
    return { nodes, edges: buildTopology(nodes) };
};
