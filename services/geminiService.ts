import { GoogleGenAI, Type } from "@google/genai";
import { ArchitectureData, ServiceTypes } from '../types';

/**
 * Since we cannot make direct AWS SDK calls from the browser due to CORS and security,
 * we use Gemini to "simulate" the discovery of an architecture based on the user's tags.
 * It generates a realistic JSON structure representing a cloud topology.
 */
export const discoverArchitecture = async (
  tagKey: string,
  tagValue: string,
  region: string
): Promise<ArchitectureData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing from environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate a JSON representation of a comprehensive AWS Cloud Architecture for a system tagged with "${tagKey}: ${tagValue}" in region "${region}".
    
    CRITICAL INSTRUCTIONS:
    1. The user wants to see ALL services that have this specific tag.
    2. You MUST include the tag key "${tagKey}" and value "${tagValue}" in the 'details' object of EVERY SINGLE NODE.
    3. Generate a complete topology with 12 to 20 nodes to ensure it looks like a real production environment.
    4. LABELS: Use REALISTIC AWS RESOURCE NAMES for the 'label' field (e.g., 'prod-app-cluster-01', 'vpc-main-us-east', 'db-primary-payment', 's3-assets-bucket'). Do NOT use generic names like "Web Server" or "Database".
    5. logical flow: Internet Gateway -> Load Balancer -> Web Tier (EC2) -> App Tier (Lambda/EC2) -> Data Tier (RDS/DynamoDB) -> Storage (S3).
    
    Return a strictly structured JSON object.
    
    Services should be one of these types (exact string match): EC2, RDS, LAMBDA, S3, VPC, ELB, API_GATEWAY, DYNAMODB.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert AWS Cloud Architect. Generate precise topology data where every resource explicitly matches the requested tags and has realistic naming conventions.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique ID (e.g., i-0f123456789abcdef)" },
                  label: { type: Type.STRING, description: "Technical Resource Name (e.g., prod-web-worker-01)" },
                  type: { type: Type.STRING, description: "Service type enum value" },
                  details: {
                    type: Type.OBJECT,
                    description: `Key value pairs. MUST include the tag ${tagKey}: ${tagValue} as the FIRST entry.`,
                    properties: {
                       [tagKey]: { type: Type.STRING },
                       ip: { type: Type.STRING },
                       instanceType: { type: Type.STRING },
                       engine: { type: Type.STRING },
                       status: { type: Type.STRING }
                    }
                  }
                },
                required: ["id", "label", "type", "details"]
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  label: { type: Type.STRING, description: "Relationship (e.g., 'connects to')" }
                },
                required: ["id", "source", "target"]
              }
            }
          },
          required: ["nodes", "edges"]
        }
      }
    });

    if (response.text) {
      const rawData = JSON.parse(response.text);
      // Sanitize types to ensure they match our Enum
      const sanitizedNodes = rawData.nodes.map((n: any) => ({
        ...n,
        type: Object.values(ServiceTypes).includes(n.type) 
          ? n.type 
          : 'UNKNOWN'
      }));
      return { nodes: sanitizedNodes, edges: rawData.edges };
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate architecture configuration.");
  }

  throw new Error("No response generated from AI model");
};