// ============================================================
// RideSharePro — Chatbot API Routes
// BRD-compliant endpoints for in-app chatbot
// ============================================================

import { Router, Request, Response, NextFunction } from 'express';
import chatbotService from '../services/chatbotService';
import { conversationService, escalationService } from '../services/conversationService';
import apiClient from '../utils/apiClient';

const router = Router();

// Middleware for error handling
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─────────────────────────────────────────────────
// POST /api/chatbot/initiate
// BRD §5.1, §5.2, Epic 1, Epic 2
// Triggered immediately after booking confirmation
// Returns: greeting with booking context
// ─────────────────────────────────────────────────
router.post(
  '/initiate',
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId, userId, driverId } = req.body;

    if (!bookingId || !userId) {
      return res.status(400).json({
        error: 'Missing required parameters: bookingId, userId',
      });
    }

    // Create conversation
    const conversation = await conversationService.createConversation(
      bookingId,
      userId,
      driverId
    );

    // BRD §5.2: Context-aware greeting with user name, booking, driver, ETA
    const { message: greeting, bookingContext } = await chatbotService.getGreeting(
      conversation.id,
      bookingId,
      userId
    );

    await conversationService.addMessage(conversation.id, 'bot', greeting, {
      type: 'greeting',
    });

    // BRD Epic 3: Quick actions based on booking status
    const bookingStatus = bookingContext.status || 'confirmed';
    const quickActions = await chatbotService.getQuickActions(bookingStatus);

    // BRD §5.2: Full booking context in response
    return res.status(201).json({
      conversationId: conversation.id,
      message: greeting,
      suggestedActions: quickActions,
      bookingContext,
    });
  })
);

// ─────────────────────────────────────────────────
// POST /api/chatbot/message
// BRD §5.4, Epic 4: Free-text NLP queries
// Response within 2 seconds
// ─────────────────────────────────────────────────
router.post(
  '/message',
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, bookingId, userId, message } = req.body;

    if (!conversationId || !bookingId || !userId || !message) {
      return res.status(400).json({
        error: 'Missing required parameters: conversationId, bookingId, userId, message',
      });
    }

    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const response = await chatbotService.processMessage({
      conversationId,
      bookingId,
      userId,
      userInput: message,
      context: {
        driverId: conversation.driverId,
      },
    });

    return res.status(200).json(response);
  })
);

// ─────────────────────────────────────────────────
// POST /api/chatbot/quick-action
// BRD §5.3, Epic 3: Quick action button taps
// One-tap interaction
// ─────────────────────────────────────────────────
router.post(
  '/quick-action',
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, bookingId, userId, action } = req.body;

    if (!conversationId || !bookingId || !userId || !action) {
      return res.status(400).json({
        error: 'Missing required parameters: conversationId, bookingId, userId, action',
      });
    }

    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // BRD: Map quick action to natural language for NLP processing
    const actionMessages: Record<string, string> = {
      where_is_driver: 'Where is my driver?',
      driver_late: 'My driver is late',
      contact_driver: 'I want to contact my driver',
      cannot_contact_driver: 'I cannot reach my driver',
      cancel_booking: 'I want to cancel my booking',
      payment_query: 'What is the fare for my ride?',
      safety_concern: 'I have a safety concern',
      call_driver: 'Call my driver',
      message_driver: 'Send a message to my driver',
      talk_to_agent: 'I want to talk to a support agent',
      ok_thanks: 'OK, thanks',
      emergency_contact: 'I need emergency help',
    };

    const message = actionMessages[action] || action;

    const response = await chatbotService.processMessage({
      conversationId,
      bookingId,
      userId,
      userInput: message,
      context: {
        action,
        driverId: conversation.driverId,
      },
    });

    return res.status(200).json(response);
  })
);

// ─────────────────────────────────────────────────
// GET /api/chatbot/conversation/:conversationId
// Get conversation details and messages
// ─────────────────────────────────────────────────
router.get(
  '/conversation/:conversationId',
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { limit } = req.query;

    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await conversationService.getMessages(
      conversationId,
      limit ? parseInt(limit as string) : undefined
    );

    return res.status(200).json({
      conversation: {
        id: conversation.id,
        bookingId: conversation.bookingId,
        userId: conversation.userId,
        status: conversation.status,
        escalationType: conversation.escalationType,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages,
    });
  })
);

// ─────────────────────────────────────────────────
// GET /api/chatbot/history/:userId
// Get user's conversation history
// ─────────────────────────────────────────────────
router.get(
  '/history/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { limit } = req.query;

    const conversations = await conversationService.getConversationHistory(
      userId,
      limit ? parseInt(limit as string) : 10
    );

    const summaries = conversations.map((conv) =>
      conversationService.getConversationSummary(conv.id)
    );

    return res.status(200).json({
      conversations: summaries,
      total: summaries.length,
    });
  })
);

// ─────────────────────────────────────────────────
// POST /api/chatbot/escalate
// BRD §5.5: Manual escalation
// Chat transcript shared automatically (Epic 5)
// ─────────────────────────────────────────────────
router.post(
  '/escalate',
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, bookingId, userId, escalationType, reason } = req.body;

    if (!conversationId || !escalationType) {
      return res.status(400).json({
        error: 'Missing required parameters: conversationId, escalationType',
      });
    }

    // BRD Epic 5: Chat transcript shared automatically
    const messages = await conversationService.getMessages(conversationId);

    const escalationRequest = await escalationService.createEscalationRequest(
      conversationId,
      bookingId,
      userId,
      escalationType,
      reason || 'Manual escalation by user',
      {
        chatTranscript: messages,
      }
    );

    let ticket;
    if (escalationType === 'support' || escalationType === 'safety') {
      ticket = await escalationService.createSupportTicket(
        escalationRequest.id,
        conversationId,
        userId
      );

      await conversationService.escalateConversation(
        conversationId,
        escalationType,
        undefined,
        ticket.id
      );
    } else {
      await conversationService.escalateConversation(
        conversationId,
        escalationType
      );
    }

    return res.status(200).json({
      escalationRequestId: escalationRequest.id,
      ticketId: ticket?.id,
      message: `Your conversation has been escalated to ${escalationType}. Chat transcript has been shared.`,
      transcript: messages.length,
    });
  })
);

// ─────────────────────────────────────────────────
// GET /api/chatbot/escalation/:requestId
// Get escalation request details
// ─────────────────────────────────────────────────
router.get(
  '/escalation/:requestId',
  asyncHandler(async (req: Request, res: Response) => {
    const { requestId } = req.params;

    const escalationRequest = await escalationService.getEscalationRequest(requestId);
    if (!escalationRequest) {
      return res.status(404).json({ error: 'Escalation request not found' });
    }

    return res.status(200).json(escalationRequest);
  })
);

// ─────────────────────────────────────────────────
// GET /api/chatbot/ticket/:ticketId
// Get support ticket details
// ─────────────────────────────────────────────────
router.get(
  '/ticket/:ticketId',
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;

    const ticket = await escalationService.getSupportTicket(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    return res.status(200).json(ticket);
  })
);

// ─────────────────────────────────────────────────
// PUT /api/chatbot/ticket/:ticketId
// Update support ticket status
// ─────────────────────────────────────────────────
router.put(
  '/ticket/:ticketId',
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const { status, resolution, assignedAgent } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required parameter: status' });
    }

    const ticket = await escalationService.updateTicketStatus(
      ticketId,
      status,
      resolution,
      assignedAgent
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    return res.status(200).json(ticket);
  })
);

// ─────────────────────────────────────────────────
// GET /api/chatbot/tickets/:userId
// Get user's open support tickets
// ─────────────────────────────────────────────────
router.get(
  '/tickets/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const tickets = await escalationService.getOpenTickets(userId);

    return res.status(200).json({
      tickets,
      total: tickets.length,
    });
  })
);

// ─────────────────────────────────────────────────
// POST /api/chatbot/close
// Close a conversation (BRD §5.1: persistent until complete)
// ─────────────────────────────────────────────────
router.post(
  '/close',
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, reason } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'Missing required parameter: conversationId' });
    }

    await conversationService.closeConversation(conversationId, reason);

    return res.status(200).json({
      message: 'Conversation closed',
      conversationId,
    });
  })
);

// ─────────────────────────────────────────────────
// GET /api/chatbot/health
// Health check
// ─────────────────────────────────────────────────
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RideSharePro In-App Chatbot',
    version: '1.0.0',
  });
});

// ─────────────────────────────────────────────────
// POST /api/chatbot/chat
// Dummy API for testing dynamic responses
// ─────────────────────────────────────────────────
router.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const { message, userId } = req.body;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let reply = 'This is a dummy response from API. How can I help you today?';
    let intent = 'general/help';

    if (message) {
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('thank') || lowerMsg.includes('thanks') || lowerMsg.includes('thx') || lowerMsg.includes('cheers') || lowerMsg.includes('appreciate')) {
        reply = 'You\'re welcome! 😊 Thank you for choosing Door2Door Flights. If you need any further assistance with bookings, prices, or trips, I\'m here to help.';
        intent = 'conversation_close';
      } else if (lowerMsg.includes('flight')) {
        reply = 'We can help you track your flight status. Please provide your flight number.';
        intent = 'flight/status';
      } else if (lowerMsg.includes('price') || lowerMsg.includes('fare') || lowerMsg.includes('cost')) {
        reply = 'The estimated fare for your current trip is $24.50. This includes all taxes and fees.';
        intent = 'booking/price';
      } else if (lowerMsg.includes('driver')) {
        reply = 'Your driver is 5 minutes away and is driving a Toyota Camry (License: ABC-123).';
        intent = 'trip/driver_info';
      } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        reply = 'Hello! Welcome to RideShare Support. How can I assist you with your ride today?';
        intent = 'general/greeting';
      }
    }

    return res.status(200).json({
      success: true,
      reply,
      intent,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
