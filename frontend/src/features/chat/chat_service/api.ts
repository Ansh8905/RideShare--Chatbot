// ============================================================
// BRD-Compliant Chat API Service
// Implements all BRD endpoints: /initiate, /message, /quick-action
// ============================================================

import { ChatRequest, ChatResponse, InitResponse, EscalationRequest } from '../chat_model/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export class ChatService {
    /**
     * BRD §5.1, Epic 1: Initialize chatbot after booking confirmation
     * Endpoint: POST /api/chatbot/initiate
     */
    async initiateChatbot(bookingId: string, userId: string, driverId?: string): Promise<InitResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/chatbot/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId, userId, driverId }),
            });

            if (!response.ok) {
                throw new Error(`Initiate API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('ChatService.initiateChatbot Error:', error);
            throw error;
        }
    }

    /**
     * BRD Epic 4: Send free-text message
     * Endpoint: POST /api/chatbot/message
     */
    async sendMessage(
        conversationId: string,
        bookingId: string,
        userId: string,
        message: string
    ): Promise<ChatResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/chatbot/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, bookingId, userId, message }),
            });

            if (!response.ok) {
                throw new Error(`Message API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('ChatService.sendMessage Error:', error);
            throw error;
        }
    }

    /**
     * BRD Epic 3: Quick action button tap
     * Endpoint: POST /api/chatbot/quick-action
     */
    async sendQuickAction(
        conversationId: string,
        bookingId: string,
        userId: string,
        action: string
    ): Promise<ChatResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/chatbot/quick-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, bookingId, userId, action }),
            });

            if (!response.ok) {
                throw new Error(`Quick Action API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('ChatService.sendQuickAction Error:', error);
            throw error;
        }
    }

    /**
     * BRD Epic 5: Escalate to driver/support
     * Endpoint: POST /api/chatbot/escalate
     */
    async escalate(request: EscalationRequest): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/chatbot/escalate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Escalation API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('ChatService.escalate Error:', error);
            throw error;
        }
    }

    /**
     * Close conversation
     * Endpoint: POST /api/chatbot/close
     */
    async closeConversation(conversationId: string, reason?: string): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/chatbot/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, reason }),
            });

            if (!response.ok) {
                throw new Error(`Close API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('ChatService.closeConversation Error:', error);
            throw error;
        }
    }
}

export default new ChatService();
