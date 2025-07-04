# Serverless Todo API - AWS Solutions Architecture Project

## Project Overview

A serverless REST API for managing a simple todo list application using AWS managed services. This project demonstrates core serverless architecture patterns and AWS best practices for building scalable, cost-effective applications.

## Architecture Diagram

![Blank diagram](https://github.com/user-attachments/assets/9818fc5f-06dc-4c14-9400-1d910746196f)


## Solution Architecture

### Core Components

1. **Amazon S3 (Static Website Hosting)**
   - Hosts the frontend React/HTML application
   - Configured for static website hosting
   - CloudFront distribution for global content delivery (optional)

2. **Amazon API Gateway**
   - RESTful API endpoints
   - Request/response transformation
   - Authentication and authorization
   - Rate limiting and throttling

3. **AWS Lambda Functions**
   - Serverless compute for business logic
   - Individual functions for each CRUD operation
   - Event-driven execution model

4. **Amazon DynamoDB**
   - NoSQL database for todo items
   - Auto-scaling capabilities
   - Built-in security and backup

5. **AWS IAM**
   - Fine-grained access control
   - Service-to-service authentication
   - Least privilege principle

6. **Amazon CloudWatch**
   - Application monitoring and logging
   - Performance metrics
   - Error tracking and alerting


## API Endpoints

### Base URL
`https://api-id.execute-api.region.amazonaws.com/prod`

### Endpoints

| Method | Endpoint | Description | Lambda Function |
|--------|----------|-------------|-----------------|
| GET | `/todos` | Get all todos (with filtering) | `getTodos` |
| GET | `/todos/{id}` | Get specific todo | `getTodos` |
| POST | `/todos` | Create new todo | `createTodo` |
| PUT | `/todos/{id}` | Update existing todo | `updateTodo` |
| DELETE | `/todos/{id}` | Delete todo | `deleteTodo` |
| GET | `/health` | Health check | `healthCheck` |
| POST | `/todos/bulk` | Create multiple todos | `bulkOperations` |
| DELETE | `/todos/bulk` | Delete multiple todos | `bulkOperations` |

### Query Parameters (GET /todos)
- `status` - Filter by status (pending, completed, archived)
- `priority` - Filter by priority (low, medium, high)
- `limit` - Limit number of results (default: 50, max: 100)
- `lastEvaluatedKey` - For pagination

### Request/Response Examples

#### Create Todo (POST /todos)
```json
Request:
{
  "title": "Learn AWS Lambda",
  "description": "Complete serverless tutorial",
  "priority": "high",
  "dueDate": "2024-12-31"
}

Response (201 Created):
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Learn AWS Lambda",
  "description": "Complete serverless tutorial",
  "priority": "high",
  "dueDate": "2024-12-31",
  "status": "pending",
  "createdAt": "2024-05-29T10:30:00Z",
  "updatedAt": "2024-05-29T10:30:00Z"
}
```

#### Get All Todos (GET /todos)
```json
Response (200 OK):
{
  "todos": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Learn AWS Lambda",
      "description": "Complete serverless tutorial",
      "priority": "high",
      "dueDate": "2024-12-31",
      "status": "pending",
      "createdAt": "2024-05-29T10:30:00Z",
      "updatedAt": "2024-05-29T10:30:00Z"
    }
  ],
  "count": 1,
  "lastEvaluatedKey": "encoded-pagination-key"
}
```

#### Update Todo (PUT /todos/{id})
```json
Request:
{
  "status": "completed",
  "description": "Tutorial completed successfully"
}

Response (200 OK):
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Learn AWS Lambda",
  "description": "Tutorial completed successfully",
  "priority": "high",
  "dueDate": "2024-12-31",
  "status": "completed",
  "createdAt": "2024-05-29T10:30:00Z",
  "updatedAt": "2024-05-30T15:45:00Z"
}
```

#### Delete Todo (DELETE /todos/{id})
```json
Response (200 OK):
{
  "message": "Todo deleted successfully",
  "deletedTodo": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Learn AWS Lambda",
    "description": "Tutorial completed successfully",
    "priority": "high",
    "dueDate": "2024-12-31",
    "status": "completed",
    "createdAt": "2024-05-29T10:30:00Z",
    "updatedAt": "2024-05-30T15:45:00Z"
  }
}
```

#### Bulk Create (POST /todos/bulk)
```json
Request:
{
  "todos": [
    {
      "title": "Task 1",
      "priority": "high"
    },
    {
      "title": "Task 2",
      "priority": "medium"
    }
  ]
}

Response (201 Created):
{
  "created": [
    {
      "id": "uuid-1",
      "title": "Task 1",
      "priority": "high",
      "status": "pending",
      "createdAt": "2024-05-30T10:00:00Z",
      "updatedAt": "2024-05-30T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "title": "Task 2",
      "priority": "medium",
      "status": "pending",
      "createdAt": "2024-05-30T10:00:00Z",
      "updatedAt": "2024-05-30T10:00:00Z"
    }
  ],
  "errors": [],
  "summary": {
    "total": 2,
    "created": 2,
    "failed": 0
  }
}
```

#### Health Check (GET /health)
```json
Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2024-05-30T10:00:00Z",
  "service": "Serverless Todo API",
  "version": "1.0.0",
  "database": "connected"
}
```b-12d3-a456-426614174000",
  "title": "Learn AWS Lambda",
  "description": "Complete serverless tutorial",
  "priority": "high",
  "dueDate": "2024-12-31",
  "status": "pending",
  "createdAt": "2024-05-29T10:30:00Z",
  "updatedAt": "2024-05-29T10:30:00Z"
}
```

## DynamoDB Table Design

### Table: `TodoItems`

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | String (PK) | Unique identifier (UUID) |
| `title` | String | Todo title |
| `description` | String | Detailed description |
| `status` | String | pending, completed, archived |
| `priority` | String | low, medium, high |
| `dueDate` | String | ISO 8601 date format |
| `createdAt` | String | Timestamp |
| `updatedAt` | String | Timestamp |

### Indexes
- **GSI1**: `status-createdAt-index` for querying by status
- **GSI2**: `priority-dueDate-index` for priority-based queries

## Lambda Functions

### 1. Create Todo Function
- **Runtime**: Node.js 18.x
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Triggers**: API Gateway POST /todos

### 2. Get Todos Function
- **Runtime**: Node.js 18.x
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Triggers**: API Gateway GET /todos, GET /todos/{id}

### 3. Update Todo Function
- **Runtime**: Node.js 18.x
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Triggers**: API Gateway PUT /todos/{id}

### 4. Delete Todo Function
- **Runtime**: Node.js 18.x
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Triggers**: API Gateway DELETE /todos/{id}

## Security Implementation

### IAM Roles and Policies

#### Lambda Execution Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:region:account:table/TodoItems*"
    }
  ]
}
```

### API Gateway Security
- API Keys for basic authentication
- Request validation
- CORS configuration
- Rate limiting (1000 requests/minute)

## Monitoring and Logging

### CloudWatch Metrics
- API Gateway: Request count, latency, error rate
- Lambda: Invocations, duration, errors, throttles
- DynamoDB: Read/write capacity, throttling

### CloudWatch Logs
- API Gateway access logs
- Lambda function logs
- Custom application metrics

### Alarms
- High error rate (>5%)
- High latency (>5 seconds)
- DynamoDB throttling

## Cost Optimization

### Estimated Monthly Costs (Low Traffic)
- API Gateway: $1-5
- Lambda: $0.50-2
- DynamoDB: $1-3
- S3: $0.50-1
- CloudWatch: $0.50-1
- **Total: ~$3-12/month**

### Optimization Strategies
- Use DynamoDB On-Demand pricing for unpredictable workloads
- Implement caching at API Gateway level
- Optimize Lambda memory allocation
- Use S3 Intelligent Tiering

## Deployment Guide

### Prerequisites
- AWS CLI configured
- AWS SAM CLI installed
- Node.js 18.x or later

### Deployment Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/serverless-todo-api.git
   cd serverless-todo-api
   ```

2. **Deploy Infrastructure**
   ```bash
   sam build
   sam deploy --guided
   ```

3. **Deploy Frontend**
   ```bash
   aws s3 sync frontend/ s3://your-bucket-name --delete
   ```

4. **Test API**
   ```bash
   curl -X GET https://your-api-id.execute-api.region.amazonaws.com/prod/todos
   ```

## Testing Strategy

### Unit Tests
- Individual Lambda function testing
- DynamoDB operations validation
- Input validation and error handling

### Integration Tests
- End-to-end API testing
- Cross-service communication
- Error scenario testing

### Load Testing
- API Gateway performance
- Lambda cold start optimization
- DynamoDB capacity planning

## Best Practices Implemented

### Security
- Least privilege IAM policies
- Input validation and sanitization
- HTTPS enforcement
- API rate limiting

### Performance
- Lambda function optimization
- DynamoDB query patterns
- Caching strategies
- Connection pooling

### Reliability
- Error handling and retry logic
- Dead letter queues
- Health checks
- Graceful degradation

### Operational Excellence
- Infrastructure as Code
- Automated deployments
- Comprehensive monitoring
- Documentation

## Learning Outcomes Achieved

1. **Serverless Architecture Design**
   - Event-driven programming model
   - Stateless application design
   - Microservices patterns

2. **AWS Service Integration**
   - API Gateway with Lambda
   - Lambda with DynamoDB
   - S3 static website hosting
   - CloudWatch monitoring

3. **Security Best Practices**
   - IAM role-based access
   - API authentication/authorization
   - Data encryption at rest and in transit

4. **Cost Optimization**
   - Pay-per-use pricing model
   - Resource right-sizing
   - Monitoring and alerting

5. **Operational Excellence**
   - Infrastructure as Code
   - Automated testing
   - Monitoring and logging

## Future Enhancements

- Implement user authentication with Amazon Cognito
- Add real-time updates using WebSockets
- Implement caching with Amazon ElastiCache
- Add CI/CD pipeline with AWS CodePipeline
- Include mobile app integration
- Add advanced search capabilities

## References

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

**Project Author**: Ahmed Mahmoud Ragab Qandeel  
**AWS Certification**: Solutions Architect Associate  
**Project Type**: Serverless REST API Demo
