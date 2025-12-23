// AWS Architecture Icons (Official 2024 Set)
// Source: https://icon.icepanel.io/AWS/svg

const BASE_URL = "https://icon.icepanel.io/AWS/svg";

export const DEFAULT_ICON = `${BASE_URL}/General/AWS-Cloud.svg`;

// Map normalized service types (upper case) to specific CDN paths
const ICON_MAP: Record<string, string> = {
  // Compute
  'EC2': 'Compute/EC2.svg',
  'LAMBDA': 'Compute/Lambda.svg',
  'ECS': 'Compute/Elastic-Container-Service.svg',
  'EKS': 'Compute/Elastic-Kubernetes-Service.svg',
  'FARGATE': 'Compute/Fargate.svg',
  'BATCH': 'Compute/Batch.svg',
  'ELASTICBEANSTALK': 'Compute/Elastic-Beanstalk.svg',

  // Database
  'RDS': 'Database/RDS.svg',
  'DYNAMODB': 'Database/DynamoDB.svg',
  'ELASTICACHE': 'Database/ElastiCache.svg',
  'REDSHIFT': 'Database/Redshift.svg',
  'AURORA': 'Database/Aurora.svg',
  'DOCDB': 'Database/DocumentDB.svg',

  // Storage
  'S3': 'Storage/Simple-Storage-Service.svg',
  'EBS': 'Storage/Elastic-Block-Store.svg',
  'EFS': 'Storage/Elastic-File-System.svg',
  'GLACIER': 'Storage/S3-Glacier.svg',
  'BACKUP': 'Storage/Backup.svg',

  // Networking & Content Delivery
  'VPC': 'Networking-Content-Delivery/VPC.svg',
  'SUBNET': 'Networking-Content-Delivery/VPC-subnet.svg',
  'ELB': 'Networking-Content-Delivery/Elastic-Load-Balancing.svg',
  'ELASTICLOADBALANCING': 'Networking-Content-Delivery/Elastic-Load-Balancing.svg',
  'ALB': 'Networking-Content-Delivery/Application-Load-Balancer.svg',
  'NLB': 'Networking-Content-Delivery/Network-Load-Balancer.svg',
  'APIGATEWAY': 'Networking-Content-Delivery/Amazon-API-Gateway.svg', // Verified Path
  'CLOUDFRONT': 'Networking-Content-Delivery/CloudFront.svg',
  'ROUTE53': 'Networking-Content-Delivery/Route-53.svg',
  'DIRECTCONNECT': 'Networking-Content-Delivery/Direct-Connect.svg',
  'TRANSITGATEWAY': 'Networking-Content-Delivery/Transit-Gateway.svg',
  'INTERNETGATEWAY': 'Networking-Content-Delivery/Internet-Gateway.svg',

  // App Integration
  'SNS': 'App-Integration/Simple-Notification-Service.svg',
  'SQS': 'App-Integration/Simple-Queue-Service.svg',
  'STEPFUNCTIONS': 'App-Integration/Step-Functions.svg',
  'STATES': 'App-Integration/Step-Functions.svg',
  'EVENTBRIDGE': 'App-Integration/EventBridge.svg',
  'EVENTS': 'App-Integration/EventBridge.svg',
  'APPSYNC': 'App-Integration/AppSync.svg',

  // Security & Identity
  'IAM': 'Security-Identity-Compliance/IAM.svg',
  'COGNITO': 'Security-Identity-Compliance/Cognito.svg',
  'COGNITO-IDP': 'Security-Identity-Compliance/Cognito.svg',
  'KMS': 'Security-Identity-Compliance/KMS.svg',
  'WAF': 'Security-Identity-Compliance/WAF.svg',
  'SHIELD': 'Security-Identity-Compliance/Shield.svg',
  'SECRETSMANAGER': 'Security-Identity-Compliance/Secrets-Manager.svg',

  // Analytics
  'KINESIS': 'Analytics/Kinesis.svg',
  'FIREHOSE': 'Analytics/Kinesis-Data-Firehose.svg',
  'ATHENA': 'Analytics/Athena.svg',
  'OPENSEARCH': 'Analytics/OpenSearch-Service.svg',

  // Management
  'CLOUDWATCH': 'Management-Governance/CloudWatch.svg',
  'CLOUDTRAIL': 'Management-Governance/CloudTrail.svg',
  'CLOUDFORMATION': 'Management-Governance/CloudFormation.svg',
  'CONFIG': 'Management-Governance/Config.svg',
  'SYSTEMSMANAGER': 'Management-Governance/Systems-Manager.svg',
  'SSM': 'Management-Governance/Systems-Manager.svg',

  // General
  'USER': 'General/User.svg',
  'INTERNET': 'General/Internet-Alt.svg',
  'CLIENT': 'General/Client.svg',
};

export const getAwsIconUrl = (serviceType: string): string => {
  if (!serviceType) return DEFAULT_ICON;

  const normalizedType = serviceType.toUpperCase()
    .replace(/[^A-Z0-9-]/g, '') 
    .replace(/^AWS/, '');

  // 1. Direct Match
  if (ICON_MAP[normalizedType]) {
    return `${BASE_URL}/${ICON_MAP[normalizedType]}`;
  }

  // 2. Partial Match / Heuristics
  if (normalizedType.includes('API') && normalizedType.includes('GATEWAY')) {
      return `${BASE_URL}/${ICON_MAP['APIGATEWAY']}`;
  }

  if (normalizedType.includes('LAMBDA')) return `${BASE_URL}/${ICON_MAP['LAMBDA']}`;
  if (normalizedType.includes('EC2')) return `${BASE_URL}/${ICON_MAP['EC2']}`;
  if (normalizedType.includes('S3')) return `${BASE_URL}/${ICON_MAP['S3']}`;
  if (normalizedType.includes('RDS') || normalizedType.includes('DB')) return `${BASE_URL}/${ICON_MAP['RDS']}`;
  if (normalizedType.includes('DYNAMO')) return `${BASE_URL}/${ICON_MAP['DYNAMODB']}`;
  if (normalizedType.includes('ELASTICLOAD')) return `${BASE_URL}/${ICON_MAP['ELB']}`;
  if (normalizedType.includes('QUEUE') || normalizedType.includes('SQS')) return `${BASE_URL}/${ICON_MAP['SQS']}`;
  if (normalizedType.includes('TOPIC') || normalizedType.includes('SNS')) return `${BASE_URL}/${ICON_MAP['SNS']}`;
  if (normalizedType.includes('STATE') || normalizedType.includes('STEP')) return `${BASE_URL}/${ICON_MAP['STEPFUNCTIONS']}`;
  if (normalizedType.includes('KINESIS')) return `${BASE_URL}/${ICON_MAP['KINESIS']}`;
  if (normalizedType.includes('COGNITO')) return `${BASE_URL}/${ICON_MAP['COGNITO']}`;

  // 3. Fallback
  return DEFAULT_ICON;
};