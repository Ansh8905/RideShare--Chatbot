# Deployment Guide

## Production Deployment

This guide covers deploying the RideShare Chatbot to production.

---

## Prerequisites

- Node.js 16+ LTS
- Docker (optional but recommended)
- PostgreSQL 12+ (for production data storage)
- Redis 6+ (for caching)
- AWS/GCP/Azure account (optional)

---

## Environment Setup

### 1. Create Production .env File

```bash
# backend/.env (production)

# Server
PORT=3001
NODE_ENV=production

# Database
DB_HOST=your-db-host.rds.amazonaws.com
DB_PORT=5432
DB_NAME=rideshare_chatbot_prod
DB_USER=admin
DB_PASSWORD=<strong-password>

# JWT
JWT_SECRET=<strong-random-key>

# APIs
BOOKING_API_URL=https://api.rideshare.com/api/bookings
DRIVER_API_URL=https://api.rideshare.com/api/drivers
PAYMENT_API_URL=https://api.rideshare.com/api/payments
NOTIFICATION_API_URL=https://api.rideshare.com/api/notifications

# NLP
ENABLE_NLP=true
NLP_CONFIDENCE_THRESHOLD=0.7

# Safety
ENABLE_SAFETY_DETECTION=true
ESCALATION_TIMEOUT=30000
MAX_RETRY_ATTEMPTS=3

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/rideshare-chatbot/app.log
```

### 2. Database Setup (PostgreSQL)

```sql
-- Create database
CREATE DATABASE rideshare_chatbot_prod;

-- Connect to database
\c rideshare_chatbot_prod

-- Create tables
CREATE TABLE conversations (
  id VARCHAR(255) PRIMARY KEY,
  booking_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  driver_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  escalation_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id),
  sender VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE escalation_requests (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id),
  booking_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  escalation_type VARCHAR(50) NOT NULL,
  reason TEXT,
  priority VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE support_tickets (
  id VARCHAR(255) PRIMARY KEY,
  escalation_request_id VARCHAR(255) NOT NULL REFERENCES escalation_requests(id),
  conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id),
  user_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  assigned_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution TEXT
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_booking ON conversations(booking_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_escalation_user ON escalation_requests(user_id);
CREATE INDEX idx_tickets_user ON support_tickets(user_id);
```

---

## Docker Deployment

### 1. Build Docker Image

Create `Dockerfile` in backend directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Clean up dev files
RUN rm -rf src tsconfig.json

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["npm", "start"]
```

### 2. Build and Push Image

```bash
# Build
docker build -t rideshare-chatbot:1.0.0 .

# Tag for registry
docker tag rideshare-chatbot:1.0.0 your-registry/rideshare-chatbot:1.0.0

# Push
docker push your-registry/rideshare-chatbot:1.0.0
```

### 3. Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rideshare_chatbot_prod
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  chatbot-api:
    build: ./backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: rideshare_chatbot_prod
      DB_USER: admin
      DB_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
```

### 4. Run with Docker Compose

```bash
# Set environment variables
export DB_PASSWORD=your-secure-password

# Start services
docker-compose up -d

# View logs
docker-compose logs -f chatbot-api

# Stop services
docker-compose down
```

---

## AWS Deployment

### Option 1: EC2 + RDS

```bash
# 1. Create EC2 instance
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium --key-name your-key

# 2. Connect to instance
ssh -i your-key.pem ec2-user@your-instance-ip

# 3. Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 4. Clone repository
git clone https://github.com/your-org/rideshare-chatbot.git
cd rideshare-chatbot/backend

# 5. Install dependencies
npm ci --only=production
npm run build

# 6. Set environment variables
export NODE_ENV=production
export PORT=3001
# ... set other env vars

# 7. Start with PM2
npm install -g pm2
pm2 start dist/index.js --name "chatbot-api"
pm2 startup
pm2 save
```

### Option 2: ECS Fargate

```bash
# 1. Push image to ECR
aws ecr create-repository --repository-name rideshare-chatbot

# 2. Tag and push
docker tag rideshare-chatbot:1.0.0 \
  your-account.dkr.ecr.region.amazonaws.com/rideshare-chatbot:1.0.0
docker push your-account.dkr.ecr.region.amazonaws.com/rideshare-chatbot:1.0.0

# 3. Create ECS task definition
# See AWS console or use awscli

# 4. Run task
aws ecs run-task --cluster production \
  --task-definition rideshare-chatbot:1 \
  --launch-type FARGATE
```

---

## Kubernetes Deployment

### 1. Create Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatbot-api
  labels:
    app: chatbot-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatbot-api
  template:
    metadata:
      labels:
        app: chatbot-api
    spec:
      containers:
      - name: chatbot-api
        image: your-registry/rideshare-chatbot:1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: chatbot-config
              key: db-host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: chatbot-secrets
              key: db-password
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
      imagePullSecrets:
      - name: registry-credentials
```

### 2. Create Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: chatbot-api
spec:
  selector:
    app: chatbot-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

### 3. Deploy

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Monitor
kubectl logs -f deployment/chatbot-api
kubectl get pods -l app=chatbot-api
```

---

## Frontend Deployment

### Option 1: AWS S3 + CloudFront

```bash
# Build frontend
cd frontend
npm run build

# Deploy to S3
aws s3 sync build/ s3://your-bucket/chatbot/

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=build
```

### Option 3: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

---

## Monitoring & Observability

### 1. CloudWatch Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /aws/ecs/chatbot-api

# View logs
aws logs tail /aws/ecs/chatbot-api --follow
```

### 2. Datadog Integration

```bash
# Install Datadog agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=<your-key> \
  DD_SITE="datadoghq.com" bash -c \
  "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_agent.sh)"

# Add custom metrics
import { StatsD } from 'node-dogstatsd';
const dogstatsd = new StatsD();
dogstatsd.increment('chatbot.messages.received');
```

### 3. Prometheus Metrics

```typescript
// Add to Express
import promClient from 'prom-client';

const messageCounter = new promClient.Counter({
  name: 'chatbot_messages_total',
  help: 'Total messages processed',
  labelNames: ['intent'],
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

---

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (AWS ALB, nginx)
- Run multiple API instances
- Use shared database for state
- Cache with Redis/Memcached

### Performance Optimization
- Enable gzip compression
- Minimize bundle size
- Use HTTP/2
- Implement request caching
- Optimize database queries

### Cost Optimization
- Use spot instances
- Implement auto-scaling
- Clean up old conversations monthly
- Archive inactive chat history

---

## Security Checklist

- [ ] SSL/TLS enabled (HTTPS only)
- [ ] Environment variables secured
- [ ] Database encrypted at rest
- [ ] Secrets managed with Vault/Secrets Manager
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] JWT authentication enabled
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] DDoS protection enabled
- [ ] Regular security audits
- [ ] Compliance: GDPR, CCPA, etc.

---

## Backup & Recovery

### Database Backups
```bash
# AWS RDS automatic backups (7 days)
aws rds create-db-snapshot \
  --db-instance-identifier chatbot-db \
  --db-snapshot-identifier chatbot-backup-$(date +%s)

# Point-in-time recovery
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier chatbot-db-restored \
  --db-snapshot-identifier chatbot-backup-123
```

### Conversation Archival
```sql
-- Archive old conversations monthly
INSERT INTO conversations_archive
SELECT * FROM conversations
WHERE updated_at < CURRENT_DATE - INTERVAL '90 days';

DELETE FROM conversations
WHERE updated_at < CURRENT_DATE - INTERVAL '90 days';
```

---

## Rollback Procedure

```bash
# If deployment failed:

# 1. Check deployment status
kubectl get deployment chatbot-api

# 2. Rollback to previous version
kubectl rollout undo deployment/chatbot-api

# 3. Verify
kubectl rollout status deployment/chatbot-api

# 4. Check pods
kubectl get pods -l app=chatbot-api
```

---

## Post-Deployment Verification

```bash
# Health check
curl https://api.rideshare.com/health

# Test API
curl -X POST https://api.rideshare.com/api/chatbot/initiate \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"b1","userId":"u1"}'

# Monitor metrics
# - Check CloudWatch dashboard
# - Review Datadog metrics
# - Verify error rates < 0.1%
```

---

## Troubleshooting

### Issue: High Memory Usage
- Check for memory leaks in conversation storage
- Implement conversation cleanup
- Reduce cache TTL

### Issue: Slow Response Times
- Check database query performance
- Implement database indexes
- Use Redis caching for frequent queries

### Issue: Connection Failures
- Verify database accessibility
- Check security groups/firewall
- Review connection pool settings

---

**Need Help?** Check logs, monitoring dashboards, and coordinate with DevOps team.

