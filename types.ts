export enum AppStep {
  CONFIG = 'CONFIG',
  LOADING = 'LOADING',
  VISUALIZE = 'VISUALIZE'
}

export enum ServiceType {
  EC2 = 'EC2',
  RDS = 'RDS',
  LAMBDA = 'LAMBDA',
  S3 = 'S3',
  VPC = 'VPC',
  LOAD_BALANCER = 'ELB',
  API_GATEWAY = 'API_GATEWAY',
  DYNAMODB = 'DYNAMODB',
  UNKNOWN = 'UNKNOWN'
}

export interface CloudNode {
  id: string;
  label: string;
  type: ServiceType;
  details?: Record<string, string>;
  parentId?: string; // For grouping like VPCs
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