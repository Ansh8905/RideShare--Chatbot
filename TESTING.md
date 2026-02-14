# Testing & QA Guide

## Comprehensive Testing Guide

This guide provides testing strategies and test cases for the RideShare Chatbot.

---

## Test Categories

1. **Unit Tests**: Individual functions
2. **Integration Tests**: Component interactions
3. **End-to-End Tests**: Full user flows
4. **Performance Tests**: Load and stress
5. **Security Tests**: Vulnerability scanning
6. **Accessibility Tests**: WCAG compliance

---

## Test Scenarios

### Test Suite 1: Happy Path Scenarios

#### Test 1.1: Complete "Where is Driver" Flow
```
Given: User just completed booking
When: User opens chatbot
Then: Display greeting with driver info
And: Show quick action buttons

When: User taps "Where is my driver?"
Then: API fetches driver location
And: Display "Driver is 5 minutes away"
And: Show contact driver option
```

**Expected Result**: ✅ PASS

---

#### Test 1.2: Driver Late Detection
```
Given: Driver ETA > 15 minutes
When: User says "Driver is late"
Then: Detect intent as driver_late
And: Fetch driver info
And: Show apology + options
```

**Test Cases**:
- ETA 20 min: "Your driver is delayed..."
- ETA 40 min: "Offer to cancel or wait"

---

#### Test 1.3: Cancel Booking Flow
```
Given: Active booking
When: User wants to cancel
Then: Check cancellation policy
And: Show free/penalty info
And: Ask for confirmation
When: User confirms
Then: Process cancellation
And: Show refund details
```

---

### Test Suite 2: Safety Detection

#### Test 2.1: Critical Safety Keywords
```
Critical keywords: "emergency", "help", "danger", "threat", "911"

When: User sends "I'm in danger!"
Then: IMMEDIATELY escalate to support
And: Do NOT wait for confirmation
And: Notify emergency team
And: Status = escalated (safety)
```

**Expected**: Response within 500ms

---

#### Test 2.2: High Severity Safety
```
High keywords: "unsafe", "scared", "harassment", "inappropriate"

When: User sends "This driver is making me uncomfortable"
Then: Mark as safety concern
And: Escalate with HIGH priority
And: Include full context in ticket
```

---

#### Test 2.3: False Positives
```
When: User sends "I'm wondering about...", "concerned about price"
Then: Detect LOW severity only
And: Do NOT escalate unnecessarily
```

---

### Test Suite 3: NLP Intent Detection

#### Test 3.1: Intent Accuracy
```
Test phrase: "Where is my driver?"
Expected intent: where_is_driver
Expected confidence: > 0.85
```

**Test Data**:
| Phrase | Expected Intent | Min Confidence |
|--------|-----------------|-----------------|
| "Where is my driver?" | where_is_driver | 0.85 |
| "Driver is taking forever" | driver_late | 0.8 |
| "I can't reach my driver" | cannot_contact_driver | 0.8 |
| "Cancel this ride" | cancel_booking | 0.9 |
| "I feel unsafe" | safety_concern | 0.9 |

---

#### Test 3.2: Low Confidence Handling
```
When: Confidence < 0.7
Then: Escalate to support
And: Show "Let me connect with agent"
And: Preserve user input for review
```

---

### Test Suite 4: Escalation Flows

#### Test 4.1: Create Support Ticket
```
When: User needs support
Then: Create escalation request
And: Create support ticket
And: Assign unique ticket ID
And: Return ticket to user
```

**Verification**:
```bash
curl http://localhost:3001/api/chatbot/tickets/user_123
```

Expected: Ticket with status "open"

---

#### Test 4.2: Driver Escalation
```
When: User selects "Call driver"
Then: Initiate driver communication
And: Preserve chat context
And: Add "escalated to driver" message
```

---

### Test Suite 5: Performance Tests

#### Test 5.1: Response Time
```bash
# Measure latency
time curl -X POST http://localhost:3001/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{...}'

# Target: < 2 seconds
# Breakdown:
# - Message receipt: 10ms
# - Safety check: 20ms
# - NLP processing: 50ms
# - Decision tree: 100ms
# - API calls: 800ms
# - Response: 20ms
# Total: ~1000ms
```

---

#### Test 5.2: Load Testing
```bash
# Install Apache Bench
apt-get install apache2-utils

# Load test
ab -n 1000 -c 10 -p payload.json \
  http://localhost:3001/api/chatbot/message

# Target:
# - 1000 requests completed
# - Response time < 2s at 90th percentile
# - Error rate < 1%
# - Throughput > 100 req/s
```

---

#### Test 5.3: Concurrent Users
```bash
# Simulate 100 concurrent users
vegeta attack -duration=60s \
  -rate=100 \
  -targets=targets.txt | vegeta report

# Expected:
# - Average response: 500ms
# - Max response: 2s
# - 99th percentile: 1.5s
```

---

### Test Suite 6: Security Tests

#### Test 6.1: SQL Injection
```bash
# Try SQL injection in message
curl -X POST http://localhost:3001/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "'; DROP TABLE messages; --",
    "bookingId": "b1",
    "userId": "u1",
    "message": "test"
  }'

# Expected: Should fail gracefully
# Actual DB should be unaffected
```

---

#### Test 6.2: XSS Prevention
```bash
# Try XSS payload
curl -X POST http://localhost:3001/api/chatbot/message \
  -d '{
    "message": "<script>alert(\"xss\")</script>"
  }'

# Expected:
# - Payload should be escaped
# - Script should NOT execute
# - Message stored safely
```

---

#### Test 6.3: Rate Limiting
```bash
# Send 100 requests from same IP in 10 seconds
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/chatbot/message \
    -H "Content-Type: application/json" \
    -d '{"conversationId":"c1",...}' &
done

# Expected:
# - Requests 51-100 return 429 (Too Many Requests)
# - Client should back off
```

---

### Test Suite 7: Frontend Component Tests

#### Test 7.1: Chat Component Rendering
```typescript
import { render, screen } from '@testing-library/react';
import Chatbot from '../components/Chatbot';

test('renders chatbot component', () => {
  render(
    <Chatbot
      bookingId="b1"
      userId="u1"
      apiUrl="http://localhost:3001"
    />
  );
  
  expect(screen.getByText(/RideShare Support/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Type your question/i)).toBeInTheDocument();
});
```

---

#### Test 7.2: Message Sending
```typescript
test('sends message on form submit', async () => {
  const { getByPlaceholderText, getByText } = render(<Chatbot {...props} />);
  
  const input = getByPlaceholderText(/Type your question/i);
  const button = getByText('Send');
  
  fireEvent.change(input, { target: { value: 'Test message' } });
  fireEvent.click(button);
  
  await waitFor(() => {
    expect(screen.getByText(/Test message/)).toBeInTheDocument();
  });
});
```

---

#### Test 7.3: Quick Action Buttons
```typescript
test('quick actions trigger correct intent', async () => {
  render(<Chatbot {...props} />);
  
  const whereIsDriverBtn = screen.getByText(/Where is my driver?/i);
  fireEvent.click(whereIsDriverBtn);
  
  // Should send quick-action request
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/quick-action'),
      expect.objectContaining({
        body: expect.stringContaining('where_is_driver')
      })
    );
  });
});
```

---

## Test Data

### Sample Conversation IDs
```javascript
const testConversations = {
  active: 'conv_test_active_001',
  escalated: 'conv_test_escalated_001',
  closed: 'conv_test_closed_001',
  long: 'conv_test_long_100_messages',
};

const testUsers = {
  normal: 'user_test_normal_001',
  vip: 'user_test_vip_001',
  feedback: 'user_test_feedback_001',
};

const testBookings = {
  active: 'booking_test_active_001',
  delayed: 'booking_test_delayed_001',
  cancelled: 'booking_test_cancelled_001',
};
```

---

## Manual Testing Checklist

### Before Release

- [ ] All flows tested manually
- [ ] Safety detection tested with keywords
- [ ] Escalation creates proper tickets
- [ ] Quick actions work correctly
- [ ] Messages save to conversation
- [ ] Closing chatbot works
- [ ] History is retrievable
- [ ] API returns correct error codes
- [ ] UI responsive on mobile
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Logs are clean

### Regression Testing

After each change:
- [ ] Run all test suites
- [ ] Check performance metrics
- [ ] Verify no new errors
- [ ] Test changed functionality
- [ ] Smoke tests on all critical paths

---

## Automating Tests

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
```

### Run Tests
```bash
npm test                  # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # Coverage report
```

---

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run lint
```

---

## Test Results Template

```
╔════════════════════════════════════════╗
║     RIDESHARE CHATBOT TEST RESULTS    ║ 
╚════════════════════════════════════════╝

Test Suite 1: Happy Path
  ✅ Where is Driver Flow
  ✅ Driver Late Detection
  ✅ Cancel Booking
  Status: 3/3 PASS

Test Suite 2: Safety Detection
  ✅ Critical Keywords
  ✅ High Severity
  ✅ False Positives
  Status: 3/3 PASS

Test Suite 3: NLP
  ✅ Intent Accuracy
  ✅ Low Confidence
  Status: 2/2 PASS

Test Suite 4: Escalation
  ✅ Support Tickets
  ✅ Driver Escalation
  Status: 2/2 PASS

Test Suite 5: Performance
  ✅ Response Time (avg: 850ms)
  ✅ Load Test (1000 req: OK)
  ✅ Concurrent Users (100: OK)
  Status: 3/3 PASS

Total: 15/15 PASS ✅
Coverage: 88%
Performance: OK
Security: OK

--- 
Ready for Production ✅
```

---

## Known Issues & Workarounds

### Issue: Slow NLP on First Request
**Cause**: Model initialization  
**Workaround**: Pre-warm classifier on server start

### Issue: High Memory with Long Conversations
**Cause**: In-memory storage  
**Workaround**: Move to database, implement cleanup job

## Support

For issues with testing:
1. Check test logs
2. Review test data
3. Verify API is running
4. Check network connectivity

