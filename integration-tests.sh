#!/usr/bin/env bash

# RideShare Chatbot Integration Test Suite
# This script performs comprehensive integration testing

set -e

API_URL="${API_URL:-http://localhost:3001}"
BOOKING_ID="test_booking_$(date +%s)"
USER_ID="test_user_$(date +%s)"
DRIVER_ID="test_driver_001"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_test() {
  local test_name=$1
  local result=$2
  
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [ "$result" -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Test 1: Health endpoint
echo -e "${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/health")
if echo "$RESPONSE" | grep -q "status"; then
  print_test "Health endpoint" 0
else
  print_test "Health endpoint" 1
fi

# Test 2: Initialize chatbot
echo -e "\n${YELLOW}Test 2: Initialize Chatbot${NC}"
INIT_RESPONSE=$(curl -s -X POST "$API_URL/api/chatbot/initiate" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"userId\": \"$USER_ID\",
    \"driverId\": \"$DRIVER_ID\"
  }")

CONVERSATION_ID=$(echo "$INIT_RESPONSE" | grep -o '"conversationId":"[^"]*' | cut -d'"' -f4)

if [ -n "$CONVERSATION_ID" ]; then
  print_test "Chatbot initialization" 0
  echo "Conversation ID: $CONVERSATION_ID"
else
  print_test "Chatbot initialization" 1
fi

# Test 3: Send message
echo -e "\n${YELLOW}Test 3: Send Message${NC}"
MESSAGE_RESPONSE=$(curl -s -X POST "$API_URL/api/chatbot/message" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"bookingId\": \"$BOOKING_ID\",
    \"userId\": \"$USER_ID\",
    \"message\": \"Where is my driver?\"
  }")

if echo "$MESSAGE_RESPONSE" | grep -q "driver"; then
  print_test "Send message" 0
else
  print_test "Send message" 1
fi

# Test 4: Quick action
echo -e "\n${YELLOW}Test 4: Quick Action${NC}"
QUICK_ACTION_RESPONSE=$(curl -s -X POST "$API_URL/api/chatbot/quick-action" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"bookingId\": \"$BOOKING_ID\",
    \"userId\": \"$USER_ID\",
    \"action\": \"driver_late\"
  }")

if echo "$QUICK_ACTION_RESPONSE" | grep -q "message"; then
  print_test "Quick action" 0
else
  print_test "Quick action" 1
fi

# Test 5: Safety detection
echo -e "\n${YELLOW}Test 5: Safety Detection${NC}"
SAFETY_RESPONSE=$(curl -s -X POST "$API_URL/api/chatbot/message" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"bookingId\": \"$BOOKING_ID\",
    \"userId\": \"$USER_ID\",
    \"message\": \"I feel unsafe with this driver\"
  }")

if echo "$SAFETY_RESPONSE" | grep -q "escalation\|safety"; then
  print_test "Safety detection" 0
else
  print_test "Safety detection" 1
fi

# Test 6: Get conversation
echo -e "\n${YELLOW}Test 6: Get Conversation${NC}"
CONV_RESPONSE=$(curl -s -X GET "$API_URL/api/chatbot/conversation/$CONVERSATION_ID")

if echo "$CONV_RESPONSE" | grep -q "$CONVERSATION_ID"; then
  print_test "Get conversation" 0
else
  print_test "Get conversation" 1
fi

# Test 7: Escalate conversation
echo -e "\n${YELLOW}Test 7: Escalate Conversation${NC}"
ESCALATE_RESPONSE=$(curl -s -X POST "$API_URL/api/chatbot/escalate" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"bookingId\": \"$BOOKING_ID\",
    \"userId\": \"$USER_ID\",
    \"escalationType\": \"support\",
    \"reason\": \"User needs assistance\"
  }")

if echo "$ESCALATE_RESPONSE" | grep -q "escalationRequestId" || echo "$ESCALATE_RESPONSE" | grep -q "ticketId"; then
  print_test "Conversation escalation" 0
else
  print_test "Conversation escalation" 1
fi

# Test 8: Close conversation
echo -e "\n${YELLOW}Test 8: Close Conversation${NC}"
CLOSE_RESPONSE=$(curl -s -X POST "$API_URL/api/chatbot/close" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"reason\": \"Test completed\"
  }")

if echo "$CLOSE_RESPONSE" | grep -q "closed"; then
  print_test "Close conversation" 0
else
  print_test "Close conversation" 1
fi

# Test 9: Performance test
echo -e "\n${YELLOW}Test 9: Performance Check${NC}"
START_TIME=$(date +%s%N)

curl -s -X POST "$API_URL/api/chatbot/message" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"bookingId\": \"$BOOKING_ID\",
    \"userId\": \"$USER_ID\",
    \"message\": \"test\"
  }" > /dev/null

END_TIME=$(date +%s%N)
DURATION=$((($END_TIME - $START_TIME) / 1000000)) # Convert to ms

if [ "$DURATION" -lt 2000 ]; then
  print_test "Response time < 2s (${DURATION}ms)" 0
else
  print_test "Response time < 2s (${DURATION}ms)" 1
fi

# Test 10: Concurrent requests
echo -e "\n${YELLOW}Test 10: Concurrent Requests${NC}"

CONCURRENT=5
SUCCESS_COUNT=0

for i in $(seq 1 $CONCURRENT); do
  curl -s -X POST "$API_URL/api/chatbot/initiate" \
    -H "Content-Type: application/json" \
    -d "{
      \"bookingId\": \"testing_$i\",
      \"userId\": \"testing_$i\",
      \"driverId\": \"driver_001\"
    }" > /dev/null && SUCCESS_COUNT=$((SUCCESS_COUNT + 1)) &
done

wait

if [ "$SUCCESS_COUNT" -eq "$CONCURRENT" ]; then
  print_test "Concurrent requests ($CONCURRENT)" 0
else
  print_test "Concurrent requests ($CONCURRENT)" 1
fi

# Print summary
echo -e "\n${YELLOW}╔═══════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   TEST RESULTS SUMMARY                ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════╝${NC}"
echo -e "Total Tests: $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi
