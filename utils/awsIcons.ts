
// AWS Architecture Icons (Official Set hosted on IcePanel/CDN)
const BASE_URL = "https://icon.icepanel.io/AWS/svg";

export const DEFAULT_ICON = `${BASE_URL}/General/AWS-Cloud.svg`;

// Mapa extendido de tipos de servicio a rutas de iconos
const ICON_MAP: Record<string, string> = {
  // Compute
  'EC2': 'Compute/EC2.svg',
  'LAMBDA': 'Compute/Lambda.svg',
  'ECS': 'Compute/Elastic-Container-Service.svg',
  'EKS': 'Compute/Elastic-Kubernetes-Service.svg',
  'FARGATE': 'Compute/Fargate.svg',
  'BATCH': 'Compute/Batch.svg',
  'ELASTICBEANSTALK': 'Compute/Elastic-Beanstalk.svg',
  'SERVERLESS': 'Compute/Serverless.svg',
  'APP-RUNNER': 'Compute/App-Runner.svg',
  'LIGHTSAIL': 'Compute/Lightsail.svg',

  // Database
  'RDS': 'Database/RDS.svg',
  'DYNAMODB': 'Database/DynamoDB.svg',
  'ELASTICACHE': 'Database/ElastiCache.svg',
  'REDSHIFT': 'Database/Redshift.svg',
  'AURORA': 'Database/Aurora.svg',
  'DOCDB': 'Database/DocumentDB.svg',
  'TIMESTREAM': 'Database/Timestream.svg',
  'NEPTUNE': 'Database/Neptune.svg',

  // Storage
  'S3': 'Storage/Simple-Storage-Service.svg',
  'EBS': 'Storage/Elastic-Block-Store.svg',
  'EFS': 'Storage/Elastic-File-System.svg',
  'GLACIER': 'Storage/S3-Glacier.svg',
  'BACKUP': 'Storage/Backup.svg',

  // Networking
  'VPC': 'Networking-Content-Delivery/VPC.svg',
  'SUBNET': 'Networking-Content-Delivery/VPC-subnet.svg',
  'ELB': 'Networking-Content-Delivery/Elastic-Load-Balancing.svg',
  'ELASTICLOADBALANCING': 'Networking-Content-Delivery/Elastic-Load-Balancing.svg',
  'ALB': 'Networking-Content-Delivery/Application-Load-Balancer.svg',
  'NLB': 'Networking-Content-Delivery/Network-Load-Balancer.svg',
  'TARGETGROUP': 'Networking-Content-Delivery/Elastic-Load-Balancing.svg', // Icono compartido con ELB
  'APIGATEWAY': 'Networking-Content-Delivery/API-Gateway.svg', 
  'EXECUTE-API': 'Networking-Content-Delivery/API-Gateway.svg',
  'CLOUDFRONT': 'Networking-Content-Delivery/CloudFront.svg',
  'ROUTE53': 'Networking-Content-Delivery/Route-53.svg',
  'DIRECTCONNECT': 'Networking-Content-Delivery/Direct-Connect.svg',
  'TRANSITGATEWAY': 'Networking-Content-Delivery/Transit-Gateway.svg',
  'INTERNETGATEWAY': 'Networking-Content-Delivery/Internet-Gateway.svg',
  'NATGATEWAY': 'Networking-Content-Delivery/NAT-Gateway.svg',
  'VPCLATICE': 'Networking-Content-Delivery/VPC-Lattice.svg',

  // App Integration
  'SNS': 'App-Integration/Simple-Notification-Service.svg',
  'SQS': 'App-Integration/Simple-Queue-Service.svg',
  'STEPFUNCTIONS': 'App-Integration/Step-Functions.svg',
  'STATES': 'App-Integration/Step-Functions.svg',
  'EVENTBRIDGE': 'App-Integration/EventBridge.svg',
  'EVENTS': 'App-Integration/EventBridge.svg',
  'APPSYNC': 'App-Integration/AppSync.svg',
  'MQ': 'App-Integration/MQ.svg',

  // Security & Identity
  'IAM': 'Security-Identity-Compliance/IAM.svg',
  'COGNITO': 'Security-Identity-Compliance/Cognito.svg',
  'COGNITO-IDP': 'Security-Identity-Compliance/Cognito.svg',
  'KMS': 'Security-Identity-Compliance/KMS.svg',
  'WAF': 'Security-Identity-Compliance/WAF.svg',
  'WAFV2': 'Security-Identity-Compliance/WAF.svg',
  'SHIELD': 'Security-Identity-Compliance/Shield.svg',
  'SECRETSMANAGER': 'Security-Identity-Compliance/Secrets-Manager.svg',
  'CERTIFICATEMANAGER': 'Security-Identity-Compliance/Certificate-Manager.svg',
  'GUARDDUTY': 'Security-Identity-Compliance/GuardDuty.svg',
  'INSPECTOR': 'Security-Identity-Compliance/Inspector.svg',

  // Management & Governance
  'CLOUDFORMATION': 'Management-Governance/CloudFormation.svg',
  'CLOUDWATCH': 'Management-Governance/CloudWatch.svg',
  'LOGS': 'Management-Governance/CloudWatch.svg',
  'CONFIG': 'Management-Governance/Config.svg',
  'OPSWORKS': 'Management-Governance/OpsWorks.svg',
  'SYSTEMSMANAGER': 'Management-Governance/Systems-Manager.svg',
  'SSM': 'Management-Governance/Systems-Manager.svg',
  'ORGANIZATIONS': 'Management-Governance/Organizations.svg',
  'AUTOSCALING': 'Management-Governance/Auto-Scaling.svg',

  // Analytics
  'KINESIS': 'Analytics/Kinesis.svg',
  'FIREHOSE': 'Analytics/Kinesis-Data-Firehose.svg',
  'ATHENA': 'Analytics/Athena.svg',
  'GLUE': 'Analytics/Glue.svg',
  'OPENSEARCH': 'Analytics/OpenSearch-Service.svg',
  'ES': 'Analytics/OpenSearch-Service.svg',

  // Containers
  'ECR': 'Compute/Elastic-Container-Registry.svg',

  // General
  'USER': 'General/User.svg',
  'INTERNET': 'General/Internet-Alt.svg',
  'CLIENT': 'General/Client.svg',
};

export const getAwsIconUrl = (serviceType: string): string => {
  if (!serviceType) return DEFAULT_ICON;
  
  let normalized = serviceType.toUpperCase();

  // 1. Intento directo por mapa exacto
  if (ICON_MAP[normalized]) return `${BASE_URL}/${ICON_MAP[normalized]}`;

  // 2. Limpieza de prefijos AWS (ej: AWS::Lambda::Function -> LAMBDA)
  if (normalized.startsWith('AWS::')) {
      const parts = normalized.split('::');
      if (parts.length > 1) {
          // Intentar con la segunda parte (ej. EC2)
          if (ICON_MAP[parts[1]]) return `${BASE_URL}/${ICON_MAP[parts[1]]}`;
      }
  }

  // 3. Heurísticas por coincidencia de texto
  const cleanType = normalized.replace(/[^A-Z0-9]/g, '');

  if (cleanType.includes('APIGATEWAY') || cleanType.includes('EXECUTEAPI')) return `${BASE_URL}/${ICON_MAP['APIGATEWAY']}`;
  if (cleanType.includes('LAMBDA')) return `${BASE_URL}/${ICON_MAP['LAMBDA']}`;
  if (cleanType.includes('EC2') || cleanType.includes('INSTANCE')) return `${BASE_URL}/${ICON_MAP['EC2']}`;
  if (cleanType.includes('S3') || cleanType.includes('BUCKET')) return `${BASE_URL}/${ICON_MAP['S3']}`;
  if (cleanType.includes('RDS') || cleanType.includes('DBINSTANCE')) return `${BASE_URL}/${ICON_MAP['RDS']}`;
  if (cleanType.includes('DYNAMO')) return `${BASE_URL}/${ICON_MAP['DYNAMODB']}`;
  if (cleanType.includes('TARGETGROUP')) return `${BASE_URL}/${ICON_MAP['TARGETGROUP']}`; // Prioridad a TG
  if (cleanType.includes('ELASTICLOAD') || cleanType.includes('ELB') || cleanType.includes('ALB') || cleanType.includes('NLB')) return `${BASE_URL}/${ICON_MAP['ELB']}`;
  if (cleanType.includes('LOGS') || cleanType.includes('LOGGROUP')) return `${BASE_URL}/${ICON_MAP['LOGS']}`;
  if (cleanType.includes('CLOUDFORMATION') || cleanType.includes('STACK')) return `${BASE_URL}/${ICON_MAP['CLOUDFORMATION']}`;
  if (cleanType.includes('ECS') || cleanType.includes('CLUSTER') || cleanType.includes('SERVICE')) return `${BASE_URL}/${ICON_MAP['ECS']}`;
  if (cleanType.includes('SNS')) return `${BASE_URL}/${ICON_MAP['SNS']}`;
  if (cleanType.includes('SQS')) return `${BASE_URL}/${ICON_MAP['SQS']}`;

  return DEFAULT_ICON;
};
