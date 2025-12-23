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

  // 1. Storage & Backup Exclusions
  if (arn.includes(':snapshot')) return false; 
  if (arn.includes('snapshot/')) return false;
  if (arn.includes(':cluster-snapshot:')) return false; 
  if (arn.includes(':image/')) return false;          
  if (arn.includes(':volume/')) return false;         
  if (arn.includes(':backup-vault/')) return false;   

  // 2. Network Plumbing Exclusions
  if (arn.includes(':network-interface/')) return false; 
  if (arn.includes(':security-group/')) return false;    
  if (arn.includes(':subnet/')) return false;            
  if (arn.includes(':listener/')) return false;          
  if (arn.includes(':listener-rule/')) return false;     
  if (arn.includes(':route-table/')) return false;       
  if (arn.includes(':internet-gateway/')) return false;  
  if (arn.includes(':dhcp-options/')) return false;
  
  // 3. Compute Versions & Deployments Exclusions
  if (arn.includes(':layer:')) return false;             
  if (arn.includes(':task-definition/')) return false;   
  if (arn.includes(':deployment/')) return false;        
  if (arn.includes(':stage/')) return false;             
  if (arn.includes(':launch-template/')) return false;   

  // 4. Identity & Monitoring Exclusions
  if (arn.includes(':policy/')) return false;            
  if (arn.includes(':role/')) return false;              
  if (arn.includes(':alarm:')) return false;             
  if (arn.includes(':event-rule/')) return false;        
  if (arn.includes(':alias/')) return false;             

  // 5. Lambda specific logic
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
    
    // 1. API Gateway Inspection (V2 HTTP & V1 REST)
    const apiNodes = enrichedNodes.filter(n => n.type === 'APIGATEWAY' || n.type === 'EXECUTE-API');
    const apiPromise = Promise.all(apiNodes.map(async (node) => {
        try {
            const apiId = node.id;
            const lambdaTargets: string[] = []; // Specific lambda names found
            
            // Attempt 1: REST APIs (V1)
            let response = await fetchAws({
                accessKey, secretKey, region, service: 'apigateway', host: `apigateway.${region}.amazonaws.com`,
                path: `/restapis/${apiId}/resources`, method: 'GET', body: '', 
                headers: { "Accept": "application/json" },
                query: { embed: 'methods' }
            });
            
            if (response.ok) {
                const data = await response.json();
                const items = data._embedded?.item || data.items || []; 

                const extractFromItem = (item: any) => {
                    if (item.resourceMethods) {
                        Object.values(item.resourceMethods).forEach((method: any) => {
                            if (method.methodIntegration) {
                                const uri = method.methodIntegration.uri || '';

                                // Lógica mejorada de extracción de Lambda
                                // URI format: arn:aws:apigateway:{region}:lambda:path/2015-03-31/functions/{LambdaARN}/invocations
                                if (uri.includes(':function:')) {
                                    const parts = uri.split(':function:');
                                    if (parts.length > 1) {
                                        // "NombreFuncion/invocations" o "NombreFuncion:Alias/invocations"
                                        const tail = parts[1]; 
                                        let funcName = tail.split('/invocations')[0];
                                        // Remover alias si existen
                                        funcName = funcName.split(':')[0];
                                        if (funcName) lambdaTargets.push(funcName);
                                    }
                                } 
                            }
                        });
                    }
                };

                if (Array.isArray(items)) items.forEach(extractFromItem);
                
                if (lambdaTargets.length > 0) {
                    node.details = { ...node.details, lambdaTargets: JSON.stringify([...new Set(lambdaTargets)]) };
                }
            } else {
                 // Attempt 2: API Gateway V2 (HTTP APIs)
                response = await fetchAws({
                    accessKey, secretKey, region, service: 'apigateway', host: `apigateway.${region}.amazonaws.com`,
                    path: `/v2/apis/${apiId}/integrations`, method: 'GET', body: '', headers: {}
                });

                if (response.ok) {
                    const data = await response.json();
                    const items = data.Items || [];
                    const foundTargets: string[] = [];
                    items.forEach((item: any) => {
                        const uri = item.IntegrationUri || '';
                        if (uri.includes(':function:')) {
                             const parts = uri.split(':function:');
                             if (parts.length > 1) {
                                 let funcName = parts[1].split('/invocations')[0];
                                 funcName = funcName.split(':')[0];
                                 if (funcName) foundTargets.push(funcName);
                             }
                        }
                    });
                    if (foundTargets.length > 0) {
                        node.details = { ...node.details, lambdaTargets: JSON.stringify([...new Set(foundTargets)]) };
                    }
                }
            }
        } catch (e) {
            console.warn(`Failed to inspect API ${node.id}`, e);
        }
    }));

    // 2. WAF Inspection
    const wafNodes = enrichedNodes.filter(n => n.type === 'WAF' || n.type === 'WAFV2');
    const wafPromise = Promise.all(wafNodes.map(async (node) => {
        try {
            const arn = node.details?.arn || '';
            if (!arn) return;
            
            // ListResourcesForWebACL requires the Web ACL ARN and Scope (REGIONAL or CLOUDFRONT)
            // Assuming REGIONAL for most tag-based resources scan, unless global.
            const payload = { 
                WebACLArn: arn,
                ResourceType: 'APPLICATION_LOAD_BALANCER' // Can also be API_GATEWAY, APPSYNC
            };

            const response = await fetchAws({
                accessKey, secretKey, region, service: 'wafv2', host: `wafv2.${region}.amazonaws.com`,
                path: '/', method: 'POST', body: JSON.stringify(payload),
                headers: { "X-Amz-Target": "AWSWAF_20190729.ListResourcesForWebACL" }
            });

            if (response.ok) {
                const data = await response.json();
                const resourceArns = data.ResourceArns || [];
                if (resourceArns.length > 0) {
                     node.details = { ...node.details, protectedResources: JSON.stringify(resourceArns) };
                }
            }
            
            // Try checking for API Gateway as well
            const payloadApi = { WebACLArn: arn, ResourceType: 'API_GATEWAY' };
            const responseApi = await fetchAws({
                accessKey, secretKey, region, service: 'wafv2', host: `wafv2.${region}.amazonaws.com`,
                path: '/', method: 'POST', body: JSON.stringify(payloadApi),
                headers: { "X-Amz-Target": "AWSWAF_20190729.ListResourcesForWebACL" }
            });
             if (responseApi.ok) {
                const data = await responseApi.json();
                const resourceArns = data.ResourceArns || [];
                if (resourceArns.length > 0) {
                     const existing = node.details?.protectedResources ? JSON.parse(node.details.protectedResources) : [];
                     node.details = { ...node.details, protectedResources: JSON.stringify([...existing, ...resourceArns]) };
                }
            }
        } catch (e) {
            console.warn(`Failed to inspect WAF ${node.id}`, e);
        }
    }));

    // 3. Lambda Inspection (Env Vars)
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

    // 4. ELB Inspection (Targets)
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
            console.warn(`Failed to inspect ELB ${node.id}`, e);
        }
    }));

    await Promise.all([apiPromise, wafPromise, lambdaPromise, elbPromise]);
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