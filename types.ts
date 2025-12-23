export enum AppStep {
  CONFIG = 'CONFIG',
  LOADING = 'LOADING',
  VISUALIZE = 'VISUALIZE'
}

// We keep common constants for logic references, but the node type itself is now a string
export const ServiceTypes = {
  EC2: 'EC2',
  RDS: 'RDS',
  LAMBDA: 'LAMBDA',
  S3: 'S3',
  VPC: 'EC2/VPC', // VPCs are often under the EC2 namespace in ARNs, but we distinguish them
  LOAD_BALANCER: 'ELASTICLOADBALANCING',
  API_GATEWAY: 'APIGATEWAY',
  DYNAMODB: 'DYNAMODB',
  SNS: 'SNS',
  SQS: 'SQS',
  CLOUDFRONT: 'CLOUDFRONT',
  COGNITO: 'COGNITO-IDP',
  KINESIS: 'KINESIS',
  STATES: 'STATES', // Step Functions
  WAF: 'WAF',
  IAM: 'IAM'
};

export interface CloudNode {
  id: string;
  label: string;
  type: string; // Changed from Enum to string to support ANY service found in ARN
  details?: Record<string, string>;
  parentId?: string;
}

export interface CloudEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: any;
}

export interface ArchitectureData {
  nodes: CloudNode[];
  edges: CloudEdge[];
}

export interface ConfigFormData {
  accessKey: string;
  secretKey: string;
  region: string;
  tagKey: string;
  tagValue: string;
}