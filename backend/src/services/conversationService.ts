import { v4 as uuidv4 } from 'uuid';
import { Conversation, ChatMessage, EscalationRequest, SupportTicket } from '../types';
import logger from '../utils/logger';

class ConversationService {
  private conversations: Map<string, Conversation>;
  private messageArchive: Map<string, ChatMessage[]>;

  constructor() {
    this.conversations = new Map();
    this.messageArchive = new Map();
  }

  async createConversation(
    bookingId: string,
    userId: string,
    driverId?: string
  ): Promise<Conversation> {
    const conversationId = uuidv4();
    const conversation: Conversation = {
      id: conversationId,
      bookingId,
      userId,
      driverId,
      messages: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(conversationId, conversation);
    this.messageArchive.set(conversationId, []);

    logger.info('Conversation created', { conversationId, bookingId, userId });

    return conversation;
  }

  async addMessage(
    conversationId: string,
    sender: 'user' | 'bot' | 'driver' | 'support_agent',
    message: string,
    metadata?: Record<string, any>
  ): Promise<ChatMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      conversationId,
      sender,
      message,
      timestamp: new Date(),
      metadata,
    };

    conversation.messages.push(chatMessage);
    if (!this.messageArchive.has(conversationId)) {
      this.messageArchive.set(conversationId, []);
    }
    this.messageArchive.get(conversationId)!.push(chatMessage);

    conversation.updatedAt = new Date();

    logger.debug('Message added', {
      conversationId,
      sender,
      messageLength: message.length,
    });

    return chatMessage;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  async getMessages(conversationId: string, limit?: number): Promise<ChatMessage[]> {
    const messages = this.messageArchive.get(conversationId) || [];

    if (limit && limit > 0) {
      return messages.slice(-limit);
    }

    return messages;
  }

  async updateConversationStatus(
    conversationId: string,
    status: 'active' | 'resolved' | 'escalated' | 'closed'
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.status = status;
    conversation.updatedAt = new Date();

    logger.info('Conversation status updated', { conversationId, status });
  }

  async escalateConversation(
    conversationId: string,
    escalationType: 'driver' | 'support' | 'safety',
    driverId?: string,
    supportAgentId?: string
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.escalationType = escalationType;
    conversation.status = 'escalated';

    if (driverId) {
      conversation.driverId = driverId;
    }
    if (supportAgentId) {
      conversation.supportAgentId = supportAgentId;
    }

    conversation.updatedAt = new Date();

    logger.info('Conversation escalated', {
      conversationId,
      escalationType,
      driverId,
      supportAgentId,
    });
  }

  async closeConversation(conversationId: string, reason?: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.status = 'closed';
    conversation.updatedAt = new Date();

    logger.info('Conversation closed', { conversationId, reason });
  }

  async getConversationHistory(userId: string, limit: number = 10): Promise<Conversation[]> {
    const userConversations = Array.from(this.conversations.values())
      .filter((conv) => conv.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);

    return userConversations;
  }

  getConversationSummary(conversationId: string): any {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    return {
      id: conversation.id,
      bookingId: conversation.bookingId,
      userId: conversation.userId,
      status: conversation.status,
      messageCount: conversation.messages.length,
      escalated: conversation.escalationType ? true : false,
      escalationType: conversation.escalationType,
      duration: new Date(conversation.updatedAt).getTime() - new Date(conversation.createdAt).getTime(),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}

class EscalationService {
  private escalationRequests: Map<string, EscalationRequest>;
  private supportTickets: Map<string, SupportTicket>;
  private escalationCallbacks: Map<string, Function[]>;

  constructor() {
    this.escalationRequests = new Map();
    this.supportTickets = new Map();
    this.escalationCallbacks = new Map();
  }

  async createEscalationRequest(
    conversationId: string,
    bookingId: string,
    userId: string,
    escalationType: 'driver' | 'support' | 'safety',
    reason: string,
    context: Record<string, any>
  ): Promise<EscalationRequest> {
    const requestId = uuidv4();
    const priority =
      escalationType === 'safety' ? 'critical' : context.priority || 'medium';

    const escalationRequest: EscalationRequest = {
      id: requestId,
      conversationId,
      bookingId,
      userId,
      escalationType,
      reason,
      priority: priority as 'low' | 'medium' | 'high' | 'critical',
      timestamp: new Date(),
      context,
    };

    this.escalationRequests.set(requestId, escalationRequest);

    logger.info('Escalation request created', {
      requestId,
      escalationType,
      priority,
      conversationId,
    });

    // Trigger callbacks
    await this.triggerCallbacks('escalation_created', escalationRequest);

    return escalationRequest;
  }

  async createSupportTicket(
    escalationRequestId: string,
    conversationId: string,
    userId: string
  ): Promise<SupportTicket> {
    const ticketId = uuidv4();
    const ticket: SupportTicket = {
      id: ticketId,
      escalationRequestId,
      conversationId,
      userId,
      status: 'open',
      createdAt: new Date(),
    };

    this.supportTickets.set(ticketId, ticket);

    logger.info('Support ticket created', {
      ticketId,
      escalationRequestId,
      conversationId,
    });

    await this.triggerCallbacks('ticket_created', ticket);

    return ticket;
  }

  async updateTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
    resolution?: string,
    assignedAgent?: string
  ): Promise<SupportTicket | null> {
    const ticket = this.supportTickets.get(ticketId);
    if (!ticket) return null;

    ticket.status = status;
    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
      ticket.resolution = resolution;
    }
    if (assignedAgent) {
      ticket.assignedAgent = assignedAgent;
    }

    logger.info('Support ticket updated', { ticketId, status });
    await this.triggerCallbacks('ticket_updated', ticket);

    return ticket;
  }

  async getEscalationRequest(requestId: string): Promise<EscalationRequest | null> {
    return this.escalationRequests.get(requestId) || null;
  }

  async getSupportTicket(ticketId: string): Promise<SupportTicket | null> {
    return this.supportTickets.get(ticketId) || null;
  }

  async getOpenTickets(userId?: string): Promise<SupportTicket[]> {
    const tickets = Array.from(this.supportTickets.values()).filter(
      (ticket) => ticket.status !== 'closed'
    );

    if (userId) {
      return tickets.filter((t) => t.userId === userId);
    }

    return tickets;
  }

  registerCallback(eventType: string, callback: Function): void {
    if (!this.escalationCallbacks.has(eventType)) {
      this.escalationCallbacks.set(eventType, []);
    }
    this.escalationCallbacks.get(eventType)!.push(callback);
  }

  private async triggerCallbacks(eventType: string, data: any): Promise<void> {
    const callbacks = this.escalationCallbacks.get(eventType) || [];
    for (const callback of callbacks) {
      try {
        await callback(data);
      } catch (error) {
        logger.error('Callback execution failed', { eventType, error });
      }
    }
  }
}

export { ConversationService, EscalationService };
export const conversationService = new ConversationService();
export const escalationService = new EscalationService();
