import { ArchitectureData, CloudNode, ServiceTypes } from '../types';
import { buildTopology } from './topologyBuilder';

/**
 * Dynamically determines the service type from the AWS ARN.
 */
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

  if (service === 'ELASTICLOADBALANCING') return 'ELB';
  return service;
};

const extractIdFromArn = (arn: string): string => {
  const parts = arn.split(':');
  const lastPart = parts[parts.length - 1];
  if (lastPart.includes('/')) {
    return lastPart.split('/').pop() || lastPart;
  }
  return lastPart;
};

// --- AWS Signature V4 Implementation ---
const encoder = new TextEncoder();
async function hmac(key: ArrayBuffer | CryptoKey, data: string): Promise<ArrayBuffer> {
    const importedKey = key instanceof CryptoKey 
        ? key 
        : await crypto.subtle.importKey("raw", key as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
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
    accessKey: string;
    secretKey: string;
    region: string;
    service: string;
    host: string;
    path: string;
    method: string;
    body: string;
    headers: Record<string, string>;
    query?: Record<string, string>;
    contentType?: string;
}
async function fetchAws(config: AwsRequestConfig) {
    const { accessKey, secretKey, region, service, host, path, method, body, headers, query, contentType } = config;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    let canonicalQuerystring = "";
    if (query) {
        const sortedQueryKeys = Object.keys(query).sort();
        canonicalQuerystring = sortedQueryKeys.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&');
    }
    const baseHeaders: Record<string, string> = { ...headers, "Host": host, "X-Amz-Date": amzDate };
    if (contentType) baseHeaders["Content-Type"] = contentType;
    else if (body) baseHeaders["Content-Type"] = "application/x-amz-json-1.1";
    const canonicalHeadersObj: Record<string, string> = {};
    Object.keys(baseHeaders).forEach(key => { canonicalHeadersObj[key.toLowerCase()] = String(baseHeaders[key]).trim().replace(/\s+/g, ' '); });
    const sortedSignedHeadersKeys = Object.keys(canonicalHeadersObj).sort();
    let canonicalHeadersStr = "";
    let signedHeadersStr = "";
    sortedSignedHeadersKeys.forEach(key => { canonicalHeadersStr += `${key}:${canonicalHeadersObj[key]}\n`; signedHeadersStr += signedHeadersStr.length > 0 ? `;${key}` : key; });
    const payloadHash = await hashSHA256(body || "");
    const canonicalUri = path;
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeadersStr}\n${signedHeadersStr}\n${payloadHash}`;
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await hashSHA256(canonicalRequest)}`;
    const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
    const signatureBuffer = await hmac(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;
    const fetchHeaders: Record<string, string> = { ...baseHeaders, "Authorization": authorizationHeader };
    delete fetchHeaders['Host'];
    const url = `https://${host}${path}${canonicalQuerystring ? '?' + canonicalQuerystring : ''}`;
    return fetch(url, { method: method, headers: fetchHeaders, body: body || undefined });
}

// --- Deep Inspection Helpers ---

/**
 * Intelligent parser for ASL (Amazon States Language) and generic JSON.
 * Recursively searches for 'Resource' keys or 'FunctionName' parameters.
 */
const findLinkedResourcesInObject = (obj: any): string[] => {
    let links: string[] = [];
    if (!obj || typeof obj !== 'object') return links;

    // 1. Direct Resource Definitions in Task States
    if (obj.Resource && typeof obj.Resource === 'string') {
        // CASE A: Direct ARN (e.g., "arn:aws:lambda:...")
        if (obj.Resource.startsWith('arn:aws:lambda') || obj.Resource.startsWith('arn:aws:sns') || obj.Resource.startsWith('arn:aws:sqs') || obj.Resource.startsWith('arn:aws:dynamodb')) {
            links.push(obj.Resource);
        }

        // CASE B: Optimized Integration (e.g. "arn:aws:states:::lambda:invoke")
        // We look inside Parameters for the actual target
        if (obj.Resource.startsWith('arn:aws:states:::') && obj.Parameters) {
            if (obj.Parameters.FunctionName) links.push(obj.Parameters.FunctionName);
            if (obj.Parameters.TableName) links.push(obj.Parameters.TableName);
            if (obj.Parameters.TopicArn) links.push(obj.Parameters.TopicArn);
            if (obj.Parameters.QueueUrl) links.push(obj.Parameters.QueueUrl);
        }
    }

    // 2. Iterate over all keys (handling Arrays and Objects recursively)
    // This ensures we catch Map states, Parallel states, and deeply nested Choice/branch logic
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (typeof value === 'object') {
            links = [...links, ...findLinkedResourcesInObject(value)];
        }
    });

    return links;
};

const enrichNodesWithDeepInspection = async (
    nodes: CloudNode[],
    accessKey: string,
    secretKey: string,
    region: string
): Promise<CloudNode[]> => {
    const enrichedNodes = [...nodes];
    
    // 1. Inspect LAMBDA
    const lambdaNodes = enrichedNodes.filter(n => n.type === ServiceTypes.LAMBDA);
    const lambdaPromise = Promise.all(lambdaNodes.map(async (node) => {
        try {
            const functionName = node.label; 
            // Config
            const configResponse = await fetchAws({
                accessKey, secretKey, region, service: 'lambda', host: `lambda.${region}.amazonaws.com`,
                path: `/2015-03-31/functions/${functionName}/configuration`, method: 'GET', body: '', headers: {}
            });
            if (configResponse.ok) {
                const configData = await configResponse.json();
                if (configData.Environment?.Variables) {
                    node.details = { ...node.details, envVars: JSON.stringify(configData.Environment.Variables) };
                }
            }
            // Triggers
            const triggersResponse = await fetchAws({
                accessKey, secretKey, region, service: 'lambda', host: `lambda.${region}.amazonaws.com`,
                path: `/2015-03-31/event-source-mappings`, method: 'GET', body: '', headers: {}, query: { FunctionName: functionName }
            });
            if (triggersResponse.ok) {
                const triggersData = await triggersResponse.json();
                if (triggersData.EventSourceMappings && triggersData.EventSourceMappings.length > 0) {
                     const sources = triggersData.EventSourceMappings.map((m: any) => m.EventSourceArn).join(',');
                     node.details = { ...node.details, triggers: sources };
                }
            }
        } catch (e) { console.warn(`Failed to inspect Lambda ${node.label}`, e); }
    }));

    // 2. Inspect STEP FUNCTIONS (State Machines) - FULLY RECURSIVE
    const stateMachineNodes = enrichedNodes.filter(n => n.type === 'STATES' || n.type === 'STEPFUNCTIONS');
    const sfnPromise = Promise.all(stateMachineNodes.map(async (node) => {
        try {
            const response = await fetchAws({
                accessKey, secretKey, region, service: 'states', host: `states.${region}.amazonaws.com`,
                path: '/', method: 'POST', body: JSON.stringify({ stateMachineArn: node.details?.arn }),
                headers: { 'X-Amz-Target': 'AWSStepFunctions.DescribeStateMachine' }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.definition) {
                    const defObj = JSON.parse(data.definition);
                    // Use recursive finder
                    const foundResources = findLinkedResourcesInObject(defObj);
                    const uniqueResources = [...new Set(foundResources)];
                    
                    if (uniqueResources.length > 0) {
                        node.details = {
                            ...node.details,
                            linkedResources: JSON.stringify(uniqueResources)
                        };
                    }
                }
            }
        } catch (e) { console.warn(`Failed to inspect State Machine ${node.label}`, e); }
    }));

    // 3. Inspect SNS
    const snsNodes = enrichedNodes.filter(n => n.type === 'SNS');
    const snsPromise = Promise.all(snsNodes.map(async (node) => {
        try {
            const body = `Action=ListSubscriptionsByTopic&TopicArn=${encodeURIComponent(node.details?.arn || '')}&Version=2010-03-31`;
            const response = await fetchAws({
                accessKey, secretKey, region, service: 'sns', host: `sns.${region}.amazonaws.com`,
                path: '/', method: 'POST', body: body, headers: {}, contentType: 'application/x-www-form-urlencoded'
            });
            if (response.ok) {
                const text = await response.text();
                const endpoints: string[] = [];
                const regex = /<Endpoint>(.*?)<\/Endpoint>/g;
                let match;
                while ((match = regex.exec(text)) !== null) { endpoints.push(match[1]); }
                if (endpoints.length > 0) {
                     node.details = { ...node.details, linkedResources: JSON.stringify(endpoints) };
                }
            }
        } catch (e) { console.warn(`Failed to inspect SNS Topic ${node.label}`, e); }
    }));

    await Promise.all([lambdaPromise, sfnPromise, snsPromise]);
    return enrichedNodes;
};

// --- Main Service Function ---
export const fetchAwsResources = async (
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  tagKey: string,
  tagValue: string
): Promise<ArchitectureData> => {
    const nodes: CloudNode[] = [];
    let paginationToken: string | undefined = undefined;
    const service = "tagging";
    const host = `tagging.${region}.amazonaws.com`;
    const target = "ResourceGroupsTaggingAPI_20170126.GetResources";

    try {
        do {
            const payload = {
                TagFilters: [ { Key: tagKey, Values: [tagValue] } ],
                ResourcesPerPage: 50,
                PaginationToken: paginationToken
            };
            const response = await fetchAws({
                accessKey: accessKeyId, secretKey: secretAccessKey, region: region, service: service, host: host,
                path: "/", method: "POST", body: JSON.stringify(payload), headers: { "X-Amz-Target": target }
            });

            if (!response.ok) {
                const errText = await response.text();
                if (response.status === 403) throw new Error(`AWS Auth Error (${response.status}): ${response.statusText}. Check keys.`);
                throw new Error(`AWS API Error (${response.status}): ${errText}`);
            }
            const data = await response.json();
            paginationToken = data.PaginationToken;

            if (data.ResourceTagMappingList) {
                data.ResourceTagMappingList.forEach((resource: any) => {
                    const arn = resource.ResourceARN || '';
                    const serviceType = getServiceTypeFromArn(arn);
                    const tags: Record<string, string> = {};
                    if (Array.isArray(resource.Tags)) {
                        resource.Tags.forEach((t: any) => { if (t.Key && t.Value) tags[t.Key] = t.Value; });
                    }
                    const label = tags['Name'] || tags['name'] || extractIdFromArn(arn);
                    const id = extractIdFromArn(arn);
                    nodes.push({ id: id, label: label, type: serviceType, details: { ...tags, arn: arn } });
                });
            }
        } while (paginationToken);

        if (nodes.length > 0) {
            await enrichNodesWithDeepInspection(nodes, accessKeyId, secretAccessKey, region);
        }
    } catch (error: any) {
        console.error("Fetch AWS Error:", error);
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
             throw new Error("Network Error: Connection failed. This is likely a CORS issue. Please use a CORS extension.");
        }
        throw error;
    }
    const edges = buildTopology(nodes);
    return { nodes, edges };
};