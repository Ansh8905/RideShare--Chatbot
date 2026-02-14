// ============================================================
// BRD-Compliant Chat Controller Hook
// Manages chat state, booking context, quick actions, escalation
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, BookingContext, QuickAction } from '../chat_model/types';
import ChatService from '../chat_service/api';

interface UseChatControllerProps {
    userId: string;
    bookingId: string;
    driverId?: string;
}

export const useChatController = ({ userId, bookingId, driverId }: UseChatControllerProps) => {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // BRD §5.2: Booking Context
    const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);

    // BRD Epic 3: Quick Actions
    const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

    // BRD Epic 5: Escalation State
    const [isEscalated, setIsEscalated] = useState(false);
    const [escalationType, setEscalationType] = useState<'driver' | 'support' | 'safety' | null>(null);

    // BRD §5.1, Epic 1, Epic 2: Initialize chatbot with context-aware greeting
    const initializeChatbot = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await ChatService.initiateChatbot(bookingId, userId, driverId);

            setConversationId(response.conversationId);

            // BRD §5.2: Store booking context
            if (response.bookingContext) {
                setBookingContext(response.bookingContext);
            }

            // Add greeting message
            const greetingMsg: ChatMessage = {
                id: `msg_${Date.now()}`,
                text: response.message,
                sender: 'bot',
                timestamp: new Date(),
                metadata: { source: 'initiate' },
            };
            setMessages([greetingMsg]);

            // BRD Epic 3: Set quick actions
            if (response.suggestedActions) {
                updateQuickActions(response.suggestedActions);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to initialize chatbot';
            setError(errorMessage);
            console.error('Chatbot initialization error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [bookingId, userId, driverId]);

    // Initialize on mount
    useEffect(() => {
        initializeChatbot();
    }, [initializeChatbot]);

    // BRD Epic 4: Send free-text message
    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !conversationId) return;

        const userMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            text,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        setError(null);

        try {
            const response = await ChatService.sendMessage(conversationId, bookingId, userId, text);

            const botMsg: ChatMessage = {
                id: `msg_${Date.now() + 1}`,
                text: response.message || response.reply || '',
                sender: 'bot',
                timestamp: new Date(response.timestamp || Date.now()),
                intent: response.intent,
                metadata: response.metadata,
            };
            setMessages((prev) => [...prev, botMsg]);

            // Update quick actions if provided
            if (response.suggestedActions) {
                updateQuickActions(response.suggestedActions);
            }

            // Update booking context if provided
            if (response.bookingContext) {
                setBookingContext(response.bookingContext);
            }

            // BRD §5.5: Handle escalation
            if (response.requiresEscalation) {
                handleEscalation(response.escalationType || 'support');
            }

        } catch (err) {
            setError('Failed to send message. Please try again.');
            const errorMsg: ChatMessage = {
                id: `msg_${Date.now() + 2}`,
                text: '⚠️ Network error. Please check your connection.',
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, bookingId, userId]);

    // BRD Epic 3: Handle quick action button tap
    const sendQuickAction = useCallback(async (action: string) => {
        if (!conversationId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await ChatService.sendQuickAction(conversationId, bookingId, userId, action);

            // Add user action message
            const userMsg: ChatMessage = {
                id: `msg_${Date.now()}`,
                text: `${getActionIcon(action)} ${formatActionLabel(action)}`,
                sender: 'user',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsg]);

            // Add bot response
            const botMsg: ChatMessage = {
                id: `msg_${Date.now() + 1}`,
                text: response.message || response.reply || '',
                sender: 'bot',
                timestamp: new Date(response.timestamp || Date.now()),
                intent: response.intent,
                metadata: response.metadata,
            };
            setMessages((prev) => [...prev, botMsg]);

            // Update quick actions
            if (response.suggestedActions) {
                updateQuickActions(response.suggestedActions);
            }

            // Update booking context
            if (response.bookingContext) {
                setBookingContext(response.bookingContext);
            }

            // Handle escalation
            if (response.requiresEscalation) {
                handleEscalation(response.escalationType || 'support');
            }

        } catch (err) {
            setError('Failed to process action. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, bookingId, userId]);

    // BRD Epic 5: Handle escalation
    const handleEscalation = useCallback((type: 'driver' | 'support' | 'safety') => {
        setIsEscalated(true);
        setEscalationType(type);
    }, []);

    // Helper: Update quick actions from API response
    const updateQuickActions = (actions: string[]) => {
        const buttons: QuickAction[] = actions.map((action) => ({
            id: action,
            label: formatActionLabel(action),
            action,
            icon: getActionIcon(action),
            variant: getActionVariant(action),
        }));
        setQuickActions(buttons);
    };

    // Helper: Format action labels
    const formatActionLabel = (action: string): string => {
        const labels: Record<string, string> = {
            where_is_driver: 'Where is my driver?',
            driver_late: 'Driver is late',
            contact_driver: 'Contact driver',
            cannot_contact_driver: "Can't reach driver",
            cancel_booking: 'Cancel booking',
            talk_to_agent: 'Talk to agent',
            call_driver: 'Call driver',
            message_driver: 'Message driver',
            payment_query: 'Payment info',
            safety_concern: 'Safety concern',
            ok_thanks: 'OK, thanks',
            wait: "I'll wait",
            emergency_contact: 'Emergency help',
            retry: 'Try again',
        };
        return labels[action] || action.replace(/_/g, ' ');
    };

    // Helper: Get action icons
    const getActionIcon = (action: string): string => {
        const icons: Record<string, string> = {
            where_is_driver: '📍',
            driver_late: '⏰',
            contact_driver: '📞',
            cannot_contact_driver: '❌',
            cancel_booking: '🚫',
            talk_to_agent: '👨‍💼',
            call_driver: '📞',
            message_driver: '💬',
            payment_query: '💳',
            safety_concern: '🚨',
            ok_thanks: '✅',
            wait: '⏳',
            emergency_contact: '🆘',
            retry: '🔄',
        };
        return icons[action] || '💬';
    };

    // Helper: Get action variant
    const getActionVariant = (action: string): 'primary' | 'danger' | 'warning' | undefined => {
        if (action === 'safety_concern' || action === 'emergency_contact') return 'danger';
        if (action === 'cancel_booking') return 'warning';
        return 'primary';
    };

    return {
        conversationId,
        messages,
        isLoading,
        error,
        bookingContext,
        quickActions,
        isEscalated,
        escalationType,
        sendMessage,
        sendQuickAction,
        initializeChatbot,
    };
};
