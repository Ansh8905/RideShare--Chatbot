# Quick Start Guide

## Get Up and Running in 5 Minutes

### Step 1: Clone and Install Backend

```bash
cd backend
npm install
```

### Step 2: Start Backend Server

**Option A: Development Mode**
```bash
npm run dev
```
Server will start on `http://localhost:3001`

**Option B: Production Build**
```bash
npm run build
npm start
```

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Step 4: Start Frontend

```bash
REACT_APP_API_URL=http://localhost:3001 npm start
```
App will open on `http://localhost:3000`

### Step 5: Test the Chatbot

1. Open the app in browser
2. You should see the chatbot dialog
3. Try these test inputs:
   - "Where is my driver?"
   - "My driver is late"
   - "I can't reach my driver"
   - "I want to cancel"
   - "I feel unsafe" (tests safety detection)

---

## API Testing with cURL

### Initialize Chatbot
```bash
curl -X POST http://localhost:3001/api/chatbot/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking_001",
    "userId": "user_001",
    "driverId": "driver_001"
  }'
```

**Expected Response:**
```json
{
  "conversationId": "conv_xyz789",
  "message": "Hi there 👋 I'm here to help you with your ride...",
  "suggestedActions": ["where_is_driver", "contact_driver", ...]
}
```

### Send a Message
```bash
curl -X POST http://localhost:3001/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_xyz789",
    "bookingId": "booking_001",
    "userId": "user_001",
    "message": "Where is my driver?"
  }'
```

### Test Safety Detection
```bash
curl -X POST http://localhost:3001/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_xyz789",
    "bookingId": "booking_001",
    "userId": "user_001",
    "message": "I feel unsafe with this driver 😨"
  }'
```

**Expected Response:**
```json
{
  "conversationId": "conv_xyz789",
  "message": "Your safety is important to us. I'm escalating this to our support team.",
  "requiresEscalation": true,
  "escalationType": "safety",
  ...
}
```

### Test Quick Actions
```bash
curl -X POST http://localhost:3001/api/chatbot/quick-action \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_xyz789",
    "bookingId": "booking_001",
    "userId": "user_001",
    "action": "driver_late"
  }'
```

---

## Understanding the Response

Each chatbot response includes:

```json
{
  "conversationId": "conv_xyz789",           // Unique conversation ID
  "message": "Bot response text",            // Response to display
  "suggestedActions": ["action1", "action2"], // Quick action buttons
  "requiresEscalation": false,               // Did it need escalation?
  "escalationType": null,                    // "driver" | "support" | "safety"
  "metadata": {
    "intent": "where_is_driver",             // Detected intent
    "confidence": 0.95,                      // 0-1 confidence score
    "flowType": "where_is_driver"            // Which flow was executed
  }
}
```

---

## Configuration

### Backend Environment Variables (.env)

```bash
# Server
PORT=3001
NODE_ENV=development

# External APIs (these are mocked if unavailable)
BOOKING_API_URL=http://localhost:3000/api/bookings
DRIVER_API_URL=http://localhost:3000/api/drivers
PAYMENT_API_URL=http://localhost:3000/api/payments
NOTIFICATION_API_URL=http://localhost:3000/api/notifications

# NLP
ENABLE_NLP=true
NLP_CONFIDENCE_THRESHOLD=0.7

# Safety
ENABLE_SAFETY_DETECTION=true
ESCALATION_TIMEOUT=30000
MAX_RETRY_ATTEMPTS=3

# Logging
LOG_LEVEL=info
```

### Frontend Environment Variables (.env.local)

```bash
REACT_APP_API_URL=http://localhost:3001
```

---

## System Architecture Flow

```
┌─────────────────────────────────────────┐
│   User Opens App After Booking          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  /api/chatbot/initiate                  │
│  - Create conversation                  │
│  - Fetch user/booking context          │
│  - Generate greeting                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Display Chatbot with Quick Actions     │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴───────┐
        ▼              ▼
    User Sends    User Clicks
    Free Text     Quick Action
        │              │
        ▼              ▼
   /api/chatbot/ /api/chatbot/
    message      quick-action
        │              │
        ├──────┬───────┤
        ▼      ▼       ▼
    Safety  Intent  NLP
    Check   Detect  Analyze
        │      │       │
        ▼      ▼       ▼
   Execute Decision Tree Engine
        │
        ▼
   Need Escalation?
    │          │
   YES        NO
    │          │
    ▼          ▼
 Create    Display
 Ticket    Response
    │          │
    └─────┬────┘
          ▼
    Update Conversation
```

---

## Testing Common User Flows

### Flow 1: Where is my driver?

**User Message**: "Where is my driver?"

**System**:
1. Detects intent: `where_is_driver`
2. Executes Flow A
3. Fetches driver location (ETA, location)
4. Returns formatted response

**Expected Output**: "Your driver John is 5 minutes away..."

---

### Flow 2: Driver is Late

**User Message**: "Driver is taking forever"

**System**:
1. Detects intent: `driver_late`
2. Executes Flow B
3. Checks ETA vs threshold
4. Provides options: wait, cancel, or contact

---

### Flow 3: Safety Concern

**User Message**: "I feel unsafe"

**System**:
1. Detects safety keyword: "unsafe"
2. Severity: HIGH
3. **IMMEDIATELY** escalates to support
4. Creates support ticket
5. Notifies support team
6. User transferred to agent

⚠️ **Safety is highest priority - escalates immediately**

---

### Flow 4: Cannot Contact Driver

**User Message**: "Driver not answering"

**System**:
1. Detects intent: `cannot_contact_driver`
2. Increments contact attempt counter
3. If < 3 attempts: Suggest retry
4. If >= 3 attempts: Escalate to support

---

### Flow 5: Cancel Booking

**User Message**: "I want to cancel"

**System**:
1. Detects intent: `cancel_booking`
2. Checks cancellation policy
3. Shows free/penalty info
4. Requires user confirmation
5. Processes cancellation

---

## Monitoring & Logs

### View Logs
```bash
# Real-time logs in development
tail -f logs/app.log

# Error logs
tail -f logs/error.log
```

### Log Levels
- **INFO**: Important events (message received, escalation created)
- **WARNING**: Potential issues (API failure, safety event)
- **ERROR**: Exceptions and failures

---

## Performance Checks

### Check Response Times
```bash
time curl -X POST http://localhost:3001/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"c1","bookingId":"b1","userId":"u1","message":"Test"}'
```

**Target**: < 2 seconds (including API calls)

---

## Troubleshooting

### Issue: Backend won't start
```bash
# Check if port 3001 is in use
lsof -i :3001
# Kill if needed
kill -9 <PID>
```

### Issue: Frontend can't connect to API
- Verify backend is running: `curl http://localhost:3001/health`
- Check REACT_APP_API_URL environment variable
- Clear browser cache and reload

### Issue: Intent not detected
- Increase confidence threshold temporarily (lower = more detection)
- Check exact keywords in intentDetector.ts
- Review training data

### Issue: Safety detection too aggressive
- Review safety keyword list in safetyDetection.ts
- Adjust severity mapping
- Implement whitelist for legitimate words

---

## Next Steps

1. **Customize Safety Keywords**: Edit `backend/src/services/safetyDetection.ts`
2. **Add More Intents**: Expand training data in `backend/src/nlp/intentDetector.ts`
3. **Connect Real APIs**: Update `backend/src/utils/apiClient.ts`
4. **Integrate Database**: Replace in-memory storage in `conversationService.ts`
5. **Add Authentication**: Implement JWT middleware
6. **Deploy**: See DEPLOYMENT.md

---

## Support

- 📖 Full documentation: See README.md
- 🐛 Issues: Check logs in `logs/app.log`
- 💬 Questions: Review code comments and type definitions
- 🚀 Deployment: See DEPLOYMENT.md

---

**Happy chatting! 🚗💬**
