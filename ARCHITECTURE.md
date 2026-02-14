# Architecture Overview

## System Design

The RideShare Chatbot is designed as a modular, scalable system with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Layer                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React Components (Chatbot, MessageList, QuickActions)│  │
│  │  Services (API Client, State Management)              │  │
│  │  Styles (CSS3, Responsive Design)                     │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────────────┘
                   │ REST API (JSON)
┌──────────────────┴───────────────────────────────────────────┐
│                   API Gateway Layer                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Express.js Router                                    │  │
│  │  CORS, Body Parser, Error Handling                    │  │
│  │  Request Logging & Rate Limiting                      │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
┌──────────────┬──────────────────┬───────────────┐
│  Primary     │  Secondary       │  Support      │
│  Services    │  Services        │  Services     │
├──────────────┼──────────────────┼───────────────┤
│ • Chatbot    │ • Conversation   │ • Logger      │
│   Service    │   Service        │ • API Client  │
│ • NLP Engine │ • Escalation     │ • Validators  │
│ • Decision   │   Service        │ • Error       │
│   Tree       │ • Safety         │   Handler     │
│              │   Detection      │               │
└──────────────┴──────────────────┴───────────────┘
        │
        └────────────┬──────────────┤
                     │              │
        ┌────────────▼───┐  ┌──────▼──────────┐
        │  Data Storage  │  │  External APIs  │
        ├────────────────┤  ├─────────────────┤
        │ In-Memory:     │  │ • Booking API   │
        │ • Conversations│  │ • Driver API    │
        │ • Messages     │  │ • Payment API   │
        │ • Escalations  │  │ • Notification  │
        │ • Tickets      │  │   API           │
        │                │  │                 │
        │ Production:    │  │ Features:       │
        │ • PostgreSQL   │  │ • Location data │
        │ • Redis Cache  │  │ • ETA updates   │
        │                │  │ • Fare info     │
        └────────────────┘  └─────────────────┘
```

## Component Architecture

### Frontend Structure
```
src/
├── components/
│   ├── Chatbot.tsx          # Main chatbot UI
│   ├── MessageList.tsx       # Message display
│   └── QuickActions.tsx      # Action buttons
├── services/
│   ├── chatbotApi.ts        # API integration
│   └── storage.ts           # Local storage
├── types/
│   └── index.ts             # Type definitions
└── styles/
    ├── chatbot.css          # Component styles
    └── global.css           # Global styles
```

### Backend Structure
```
src/
├── index.ts                 # Express app setup
├── config/
│   └── index.ts             # Configuration
├── types/
│   └── index.ts             # TS types
├── routes/
│   └── chatbotRoutes.ts     # API endpoints
├── controllers/
│   └── chatbotController.ts # Route handlers
├── services/
│   ├── chatbotService.ts    # Main service
│   ├── conversationService.ts
│   ├── escalationService.ts
│   └── safetyDetection.ts
├── nlp/
│   └── intentDetector.ts    # NLP engine
├── decisionTree/
│   └── engine.ts            # Decision logic
├── database/
│   └── connection.ts        # DB setup
├── middleware/
│   ├── auth.ts              # Authentication
│   └── errorHandler.ts      # Error handling
└── utils/
    ├── logger.ts            # Logging
    ├── apiClient.ts         # API calls
    └── validators.ts        # Input validation
```

## Data Flow

### 1. User Sends Message

```
User Input
    ↓
Frontend (Chatbot Component)
    ↓
POST /api/chatbot/message
    ↓
Backend (Router)
    ↓
Chatbot Service
    ├── Safety Detection ← Check for keywords
    ├── NLP Intent Detection ← Classify intent
    ├── Fetch Context ← Get booking/driver info
    ├── Execute Decision Tree ← Route based on intent
    └── Return Response
         ↓
Update Conversation
    ├── Save message
    └── Save bot response
         ↓
Return to Frontend
    ↓
Display Message & Options
```

### 2. Escalation Flow

```
Safety Keyword Detected / User Needs Help
    ↓
Create Escalation Request
    ↓
Create Support Ticket
    ├── Set status: open
    ├── Assign priority
    └── Store context
    ↓
Update Conversation
    ├── Set status: escalated
    ├── Store escalation type
    └── Link to ticket
    ↓
Trigger Callbacks
    ├── Notify support team (email/SMS)
    ├── Update dashboard
    └── Record event
    ↓
Send Response to User
```

## Data Models

### Conversation
```typescript
{
  id: string;
  bookingId: string;
  userId: string;
  driverId?: string;
  supportAgentId?: string;
  messages: ChatMessage[];
  status: 'active' | 'resolved' | 'escalated' | 'closed';
  escalationType?: 'driver' | 'support' | 'safety';
  createdAt: Date;
  updatedAt: Date;
}
```

### ChatMessage
```typescript
{
  id: string;
  conversationId: string;
  sender: 'user' | 'bot' | 'driver' | 'support_agent';
  message: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    actionType?: string;
  };
}
```

### SafetyEvent
```typescript
{
  id: string;
  conversationId: string;
  userId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  keywords: string[];
  timestamp: Date;
  status: 'detected' | 'escalated' | 'resolved';
}
```

## Integration Points

### External API Calls

```
Chatbot Service
    ├─ Booking API
    │  └─ GET /bookings/{id}
    │  └─ POST /bookings/{id}/cancel
    │
    ├─ Driver API
    │  └─ GET /drivers/{id}
    │
    ├─ Payment API
    │  └─ GET /payment/booking/{id}
    │
    └─ Notification API
       └─ POST /notification/send
```

### Data Dependencies

```
Chatbot Service
    ├── Needs: Booking Details
    │   ├─ Status
    │   ├─ Location
    │   └─ Fare
    │
    ├── Needs: Driver Information
    │   ├─ Location (real-time)
    │   ├─ ETA
    │   ├─ Rating
    │   └─ Contact info
    │
    ├── Needs: Payment Details
    │   ├─ Estimated fare
    │   └─ Payment method
    │
    └── Needs: User Information
        ├─ Name
        ├─ Contact
        └─ Preferences
```

## Scalability Considerations

### Horizontal Scaling
- Stateless API layer
- Load balancer (nginx/AWS ALB)
- Shared database
- Redis cache for sessions

### Database Optimization
- Indexes on: user_id, booking_id, conversation_id
- Partition conversations by date
- Archive old conversations
- Clean up every 90 days

### Performance Optimization
- Cache driver information
- Cache booking details
- NLP model pre-warming
- Connection pooling
- Response compression

### Reliability
- Circuit breaker for external APIs
- Retry logic with exponential backoff
- Graceful degradation
- Fallback responses
- Dead letter queue for failed escalations

## Security Architecture

### Authentication
- JWT tokens (user/agent)
- API key validation (system-to-system)

### Authorization
- Role-based access control (RBAC)
- Conversation ownership
- Agent permissions

### Data Protection
- Encryption at rest (database)
- Encryption in transit (HTTPS)
- PII masking in logs
- Secrets management (Vault)

### Threat Prevention
- Input validation
- SQL injection protection
- XSS prevention
- Rate limiting
- DDoS protection

## Monitoring & Observability

### Metrics
- Message latency (50th, 90th, 99th percentile)
- Error rate by type
- Conversations per hour
- Escalation rate
- NLP accuracy

### Logging
- Request/response logging
- Error logging with context
- Audit logging for escalations
- Performance logging

### Alerting
- High error rate (> 1%)
- Slow responses (> 2s)
- Service unavailability
- Safety escalations
- Quota exhaustion

## Testing Strategy

### Unit Tests
- Service functions
- NLP intent detection
- Decision tree logic
- Safety detection

### Integration Tests
- API endpoints
- Service interactions
- Database operations
- External API calls

### E2E Tests
- Complete user flows
- Escalation workflows
- Edge cases
- Error scenarios

### Performance Tests
- Load testing
- Stress testing
- Latency benchmarks
- Concurrent users

## Deployment Architecture

### Development
```
Local Machine
├── Backend (npm run dev)
├── Frontend (npm start)
└── In-memory storage
```

### Staging
```
VPC
├── EC2 (Backend)
├── RDS (Database)
├── ElastiCache (Redis)
└── S3 (Static files)
```

### Production
```
Multi-AZ Setup
├── ALB (Load Balancer)
├── ECS/Kubernetes (Chatbot API)
├── RDS Multi-AZ (Database)
├── ElastiCache Cluster (Cache)
├── CloudFront (CDN)
└── CloudWatch (Monitoring)
```

## Cost Optimization

- Auto-scaling based on traffic
- Spot instances for non-critical
- S3 lifecycle policies
- Database query optimization
- Conversation archival

---

This architecture ensures scalability, reliability, and maintainability while supporting the complete BRD requirements.
