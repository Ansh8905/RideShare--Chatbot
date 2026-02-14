// ============================================================
// RideSharePro In-App Chatbot Component
// BRD-compliant: post-booking chatbot with context awareness,
// quick actions, free-text NLP, escalation, safety
// ============================================================

import React, { useEffect, useState, useRef } from 'react';
import ChatbotApiService from '../services/chatbotApi';
import { ChatbotProps, Message, QuickActionButton, BookingContext } from '../types';
import '../styles/chatbot.css';

const Chatbot: React.FC<ChatbotProps> = ({
  bookingId,
  userId,
  driverId,
  apiUrl,
  onEscalation,
  onClose,
}) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const [escalationType, setEscalationType] = useState<'driver' | 'support' | 'safety' | null>(null);
  const [quickActions, setQuickActions] = useState<QuickActionButton[]>([]);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiService = useRef(new ChatbotApiService(apiUrl));

  // BRD §5.1: Initialize chatbot immediately after booking confirmation
  useEffect(() => {
    initializeChatbot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // BRD §5.2: Context-aware greeting with booking details
  const initializeChatbot = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.current.initiateChatbot(bookingId, userId, driverId);

      setConversationId(response.conversationId);

      // BRD §5.2: Store booking context
      if (response.bookingContext) {
        setBookingContext(response.bookingContext);
      }

      const greetingMessage: Message = {
        id: `msg_${Date.now()}`,
        sender: 'bot',
        text: response.message,
        timestamp: new Date(),
        metadata: { source: 'api', endpoint: '/api/chatbot/initiate' },
      };

      setMessages([greetingMessage]);

      // BRD Epic 3: Quick actions based on booking status
      updateQuickActions(response.suggestedActions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize chatbot';
      setError(errorMessage);
      console.error('Chatbot initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuickActions = (actions: string[]) => {
    const buttons: QuickActionButton[] = actions.map((action: string) => ({
      id: action,
      label: formatActionLabel(action),
      action,
      icon: getActionIcon(action),
    }));
    setQuickActions(buttons);
  };

  const formatActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      where_is_driver: 'Where is my driver?',
      driver_late: 'Driver is late',
      contact_driver: 'Contact driver',
      cannot_contact_driver: 'Can\'t reach driver',
      cancel_booking: 'Cancel booking',
      talk_to_agent: 'Talk to agent',
      call_driver: 'Call driver',
      message_driver: 'Message driver',
      payment_query: 'Payment info',
      safety_concern: 'Safety concern',
      ok_thanks: 'OK, thanks',
      wait: 'I\'ll wait',
      emergency_contact: 'Emergency help',
      retry: 'Try again',
    };
    return labels[action] || action.replace(/_/g, ' ');
  };

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

  // BRD §5.4 / Epic 4: Free-text NLP query — ALL responses from live API
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputText.trim() || !conversationId) return;

    const messageText = inputText;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Call LIVE API endpoint /api/chatbot/message
      const response = await apiService.current.sendMessage(
        conversationId,
        bookingId,
        userId,
        messageText
      );

      const botMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'bot',
        text: response.message,
        timestamp: new Date(),
        metadata: {
          ...response.metadata,
          source: 'api',
          endpoint: '/api/chatbot/message',
        },
      };

      setMessages((prev) => [...prev, botMessage]);

      // Update quick actions from response
      if (response.suggestedActions) {
        updateQuickActions(response.suggestedActions);
      }

      // Update booking context if provided
      if (response.bookingContext) {
        setBookingContext(response.bookingContext);
      }

      // BRD §5.5: Handle escalation
      if (response.requiresEscalation) {
        handleEscalationUI(response.escalationType);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Chat API Error:', err);

      const errorBotMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'bot',
        text: '⚠️ Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // BRD §5.3/Epic 3: Quick action handler (one-tap)
  const handleQuickAction = async (action: string) => {
    if (!conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.current.sendQuickAction(
        conversationId,
        bookingId,
        userId,
        action
      );

      // Add action as user message
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        sender: 'user',
        text: `${getActionIcon(action)} ${formatActionLabel(action)}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Add bot response
      const botMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'bot',
        text: response.message,
        timestamp: new Date(),
        metadata: {
          ...response.metadata,
          source: 'api',
          endpoint: '/api/chatbot/quick-action',
        },
      };

      setMessages((prev) => [...prev, botMessage]);

      // Update quick actions based on response
      if (response.suggestedActions) {
        updateQuickActions(response.suggestedActions);
      }

      // Update booking context
      if (response.bookingContext) {
        setBookingContext(response.bookingContext);
      }

      // Handle escalation
      if (response.requiresEscalation) {
        handleEscalationUI(response.escalationType);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process action';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // BRD §5.5: Escalation UI handler
  const handleEscalationUI = (type: string) => {
    setIsEscalated(true);
    setEscalationType(type as 'driver' | 'support' | 'safety');

    if (onEscalation) {
      onEscalation(type);
    }
  };

  const handleCloseChat = async () => {
    if (conversationId) {
      try {
        await apiService.current.closeConversation(conversationId, 'User closed chat');
      } catch (err) {
        console.error('Error closing conversation:', err);
      }
    }
    if (onClose) {
      onClose();
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      confirmed: { label: 'Confirmed', className: 'status-confirmed' },
      in_progress: { label: 'In Progress', className: 'status-progress' },
      arrived: { label: 'Arrived', className: 'status-arrived' },
      completed: { label: 'Completed', className: 'status-completed' },
      cancelled: { label: 'Cancelled', className: 'status-cancelled' },
    };
    return badges[status] || { label: status, className: '' };
  };

  // Format message text: simple markdown-like formatting
  const formatMessageText = (text: string) => {
    // Bold: **text** → <strong>text</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br/>');
    // Bullet points with •
    formatted = formatted.replace(/• /g, '<span class="bullet">•</span> ');
    return formatted;
  };

  return (
    <div className="chatbot-container" id="chatbot-widget">
      {/* ── BRD: Chatbot Header ── */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="chatbot-header-avatar">🤖</div>
          <div>
            <h3>RideSharePro Assistant</h3>
            <div className="chatbot-header-status">
              <span className="online-dot"></span>
              {isEscalated
                ? `Escalated to ${escalationType}`
                : 'Online • Here to help'}
            </div>
          </div>
        </div>
        <button className="close-btn" onClick={handleCloseChat} title="Close chat" id="close-chat-btn">
          ✕
        </button>
      </div>

      {/* ── BRD §5.2: Booking Context Bar ── */}
      {bookingContext && (
        <div className="booking-context-bar" id="booking-context">
          <div className="context-row">
            <span className="context-label">🚗 Ride</span>
            <span className={`context-status ${getStatusBadge(bookingContext.status).className}`}>
              {getStatusBadge(bookingContext.status).label}
            </span>
          </div>
          <div className="context-row">
            <span className="context-detail">
              👤 {bookingContext.driverName} • {bookingContext.driverVehicle}
            </span>
          </div>
          <div className="context-row">
            <span className="context-detail">
              ⏱️ ETA: {bookingContext.eta} min • 💰 {bookingContext.estimatedFare}
            </span>
          </div>
          <div className="context-route">
            <span>📍 {bookingContext.pickup}</span>
            <span className="route-arrow">→</span>
            <span>🏁 {bookingContext.dropoff}</span>
          </div>
        </div>
      )}

      {/* ── Messages Area ── */}
      <div className="chatbot-messages" id="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.sender}`}>
            <div className="message-content">
              {message.sender === 'bot' && <span className="message-avatar">🤖</span>}
              {message.sender === 'user' && <span className="message-avatar">👤</span>}
              {message.sender === 'driver' && <span className="message-avatar">🚗</span>}
              {message.sender === 'support_agent' && <span className="message-avatar">👨‍💼</span>}
              <div className="message-body">
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: formatMessageText(message.text) }}
                />
                <div className="message-footer">
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="message message-bot">
            <div className="message-content">
              <span className="message-avatar">🤖</span>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="error-message">
            <strong>⚠️ Error:</strong> {error}
            <button className="retry-btn" onClick={initializeChatbot}>Retry</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── BRD §5.5: Escalation Notice ── */}
      {isEscalated && (
        <div className={`escalation-notice escalation-${escalationType}`}>
          {escalationType === 'safety' ? (
            <p>
              🚨 <strong>Safety Alert:</strong> Your issue has been escalated with CRITICAL priority.
              Emergency support is being dispatched. Call <strong>911</strong> if in immediate danger.
            </p>
          ) : escalationType === 'driver' ? (
            <p>
              🔔 <strong>Connected to Driver:</strong> Your chat history has been shared.
              The driver will respond shortly.
            </p>
          ) : (
            <p>
              👨‍💼 <strong>Support Connected:</strong> A human agent is reviewing your chat
              history and booking details. They will be with you shortly.
            </p>
          )}
        </div>
      )}

      {/* ── BRD §5.3/Epic 3: Quick Action Buttons ── */}
      {!isEscalated && (
        <>
          {quickActions.length > 0 && (
            <div className="quick-actions" id="quick-actions">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  className={`quick-action-btn ${action.action === 'safety_concern' || action.action === 'emergency_contact' ? 'btn-danger' : ''}`}
                  onClick={() => handleQuickAction(action.action)}
                  disabled={isLoading}
                  id={`qa-${action.id}`}
                >
                  <span className="qa-icon">{action.icon}</span>
                  <span className="qa-label">{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── BRD §5.4/Epic 4: Free-text input ── */}
          <form onSubmit={handleSendMessage} className="chatbot-input-form" id="chat-form">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your question about this ride..."
              disabled={isLoading || isEscalated}
              className="chatbot-input"
              id="chat-input"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim() || isEscalated}
              className="send-btn"
              id="chat-send-btn"
            >
              ➤
            </button>
          </form>


        </>
      )}
    </div>
  );
};

export default Chatbot;
