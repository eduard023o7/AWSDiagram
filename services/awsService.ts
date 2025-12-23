import { ArchitectureData, CloudNode, ServiceType } from '../types';
import { buildTopology } from './topologyBuilder';

/**
 * Maps AWS ARN namespaces to our internal ServiceType enum.
 */
const mapArnToServiceType = (arn: string): ServiceType => {
  if (arn.includes(':ec2:')) {
    if (arn.includes('instance/')) return ServiceType.EC2;
    if (arn.includes('vpc')) return ServiceType.VPC;
  }
  if (arn.includes(':s3:')) return ServiceType.S3;
  if (arn.includes(':rds:')) return ServiceType.RDS;
  if (arn.includes(':lambda:')) return ServiceType.LAMBDA;
  if (arn.includes(':elasticloadbalancing:')) return ServiceType.LOAD_BALANCER;
  if (arn.includes(':apigateway:')) return ServiceType.API_GATEWAY;
  if (arn.includes(':dynamodb:')) return ServiceType.DYNAMODB;
  
  return ServiceType.UNKNOWN;
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
    query?: Record<string, string>; // Add query param support
}

async function fetchAws(config: AwsRequestConfig) {
    const { accessKey, secretKey, region, service, host, path, method, body, headers, query } = config;

    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    // 1. Prepare Canonical Query String
    let canonicalQuerystring = "";
    if (query) {
        const sortedQueryKeys = Object.keys(query).sort();
        canonicalQuerystring = sortedQueryKeys.map(key => 
            `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
        ).join('&');
    }

    // 2. Prepare Headers
    const baseHeaders: Record<string, string> = {
        ...headers,
        "Host": host,
        "X-Amz-Date": amzDate
    };
    
    // Only add Content-Type if there is a body or if strictly required by service
    if (body) {
        baseHeaders["Content-Type"] = "application/x-amz-json-1.1";
    }

    // 3. Canonicalize Headers
    const canonicalHeadersObj: Record<string, string> = {};
    Object.keys(baseHeaders).forEach(key => {
        canonicalHeadersObj[key.toLowerCase()] = String(baseHeaders[key]).trim().replace(/\s+/g, ' ');
    });

    const sortedSignedHeadersKeys = Object.keys(canonicalHeadersObj).sort();
    
    let canonicalHeadersStr = "";
    let signedHeadersStr = "";

    sortedSignedHeadersKeys.forEach(key => {
        canonicalHeadersStr += `${key}:${canonicalHeadersObj[key]}\n`;
        signedHeadersStr += signedHeadersStr.length > 0 ? `;${key}` : key;
    });

    // 4. Payload Hash
    const payloadHash = await hashSHA256(body || "");

    // 5. Canonical Request
    const canonicalUri = path;
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeadersStr}\n${signedHeadersStr}\n${payloadHash}`;

    // 6. String to Sign
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await hashSHA256(canonicalRequest)}`;

    // 7. Calculate Signature
    const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
    const signatureBuffer = await hmac(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

    // 8. Final Fetch
    const fetchHeaders: Record<string, string> = { ...baseHeaders, "Authorization": authorizationHeader };
    delete fetchHeaders['Host'];

    // Construct full URL with query string
    const url = `https://${host}${path}${canonicalQuerystring ? '?' + canonicalQuerystring : ''}`;

    return fetch(url, {
        method: method,
        headers: fetchHeaders,
        body: body || undefined
    });
}

// --- Deep Inspection Helpers ---

const enrichNodesWithDeepInspection = async (
    nodes: CloudNode[],
    accessKey: string,
    secretKey: string,
    region: string
): Promise<CloudNode[]> => {
    
    const enrichedNodes = [...nodes];
    
    // 1. Inspect LAMBDA Functions
    // We look for Environment Variables and EventSourceMappings (Triggers)
    const lambdaNodes = enrichedNodes.filter(n => n.type === ServiceType.LAMBDA);
    
    await Promise.all(lambdaNodes.map(async (node) => {
        try {
            const functionName = node.label; // Assuming label is the function name or we extract from ID
            
            // A. Get Configuration (Env Vars)
            const configResponse = await fetchAws({
                accessKey, secretKey, region,
                service: 'lambda',
                host: `lambda.${region}.amazonaws.com`,
                path: `/2015-03-31/functions/${functionName}/configuration`,
                method: 'GET',
                body: '',
                headers: {}
            });

            if (configResponse.ok) {
                const configData = await configResponse.json();
                if (configData.Environment?.Variables) {
                    node.details = {
                        ...node.details,
                        envVars: JSON.stringify(configData.Environment.Variables)
                    };
                }
            }

            // B. Get Event Source Mappings (Triggers like DynamoDB, SQS)
            const triggersResponse = await fetchAws({
                accessKey, secretKey, region,
                service: 'lambda',
                host: `lambda.${region}.amazonaws.com`,
                path: `/2015-03-31/event-source-mappings`,
                method: 'GET',
                body: '',
                headers: {},
                query: { FunctionName: functionName }
            });

            if (triggersResponse.ok) {
                const triggersData = await triggersResponse.json();
                if (triggersData.EventSourceMappings && triggersData.EventSourceMappings.length > 0) {
                     const sources = triggersData.EventSourceMappings.map((m: any) => m.EventSourceArn).join(',');
                     node.details = {
                         ...node.details,
                         triggers: sources
                     };
                }
            }

        } catch (e) {
            console.warn(`Failed to inspect Lambda ${node.label}`, e);
        }
    }));

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
        // 1. Discovery Phase (Resource Groups Tagging API)
        do {
            const payload = {
                TagFilters: [
                    {
                        Key: tagKey,
                        Values: [tagValue]
                    }
                ],
                ResourcesPerPage: 50,
                PaginationToken: paginationToken
            };

            const response = await fetchAws({
                accessKey: accessKeyId,
                secretKey: secretAccessKey,
                region: region,
                service: service,
                host: host,
                path: "/",
                method: "POST",
                body: JSON.stringify(payload),
                headers: {
                    "X-Amz-Target": target,
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                if (response.status === 403) {
                     throw new Error(`AWS Auth Error (${response.status}): ${response.statusText}. Check keys.`);
                }
                throw new Error(`AWS API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            paginationToken = data.PaginationToken;

            if (data.ResourceTagMappingList) {
                data.ResourceTagMappingList.forEach((resource: any) => {
                    const arn = resource.ResourceARN || '';
                    const serviceType = mapArnToServiceType(arn);
                    
                    const tags: Record<string, string> = {};
                    if (Array.isArray(resource.Tags)) {
                        resource.Tags.forEach((t: any) => {
                            if (t.Key && t.Value) tags[t.Key] = t.Value;
                        });
                    }

                    const label = tags['Name'] || tags['name'] || extractIdFromArn(arn);
                    const id = extractIdFromArn(arn);

                    nodes.push({
                        id: id,
                        label: label,
                        type: serviceType,
                        details: {
                            ...tags,
                            arn: arn
                        }
                    });
                });
            }

        } while (paginationToken);

        // 2. Inspection Phase (Deep Dive into Configuration)
        // Only run if we found nodes.
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

    // 3. Topology Build Phase (Logic + Real Config)
    const edges = buildTopology(nodes);

    return {
        nodes,
        edges
    };
};