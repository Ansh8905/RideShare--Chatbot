// ============================================================
// BRD-Compliant ChatScreen Component
// Full-screen chat with Golden Yellow theme
// Supports: Booking Context, Quick Actions, Escalation
// ============================================================

import React, { useEffect, useRef } from 'react';
import { useChatController } from '../chat_controller/useChatController';
import {
    MessageBubble,
    TypingIndicator,
    ChatInput,
    BookingContextBar,
    QuickActions,
    EscalationNotice,
} from '../widgets/ChatWidgets';
import './chat_screen.css';

interface ChatScreenProps {
    userId: string;
    bookingId: string;
    driverId?: string;
    onClose: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ userId, bookingId, driverId, onClose }) => {
    const {
        messages,
        isLoading,
        error,
        bookingContext,
        quickActions,
        isEscalated,
        escalationType,
        sendMessage,
        sendQuickAction,
    } = useChatController({ userId, bookingId, driverId });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div className="chat-screen-container">
            {/* BRD §5.1: Chat Header */}
            <header className="chat-header">
                <div className="header-left">
                    <button className="back-btn" onClick={onClose} aria-label="Close Chat">
                        ✕
                    </button>
                    <div className="bot-info">
                        <h1 className="bot-name">RideShare Assistant</h1>
                        <span className="bot-status">
                            <span className="online-indicator"></span>
                            {isEscalated ? `Escalated to ${escalationType}` : 'Online • Here to help'}
                        </span>
                    </div>
                </div>
            </header>

            {/* BRD §5.2: Booking Context Display */}
            {bookingContext && (
                <div className="context-wrapper">
                    <BookingContextBar context={bookingContext} />
                </div>
            )}

            {/* Messages Area */}
            <div className="chat-messages-area">
                {messages.length === 0 && !isLoading && (
                    <div className="empty-state">
                        <p>👋 Hi there! How can I help you with your ride today?</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {isLoading && <TypingIndicator />}

                {error && <div className="error-banner">{error}</div>}

                <div ref={messagesEndRef} />
            </div>

            {/* BRD §5.5: Escalation Notice */}
            {isEscalated && escalationType && (
                <EscalationNotice type={escalationType} />
            )}

            {/* BRD Epic 3: Quick Action Buttons (unless escalated) */}
            {!isEscalated && quickActions.length > 0 && (
                <QuickActions
                    actions={quickActions}
                    onActionClick={sendQuickAction}
                    disabled={isLoading}
                />
            )}

            {/* BRD §5.4: Free-Text Input */}
            {!isEscalated && (
                <footer className="chat-footer">
                    <ChatInput onSend={sendMessage} disabled={isLoading} />
                </footer>
            )}

            {/* Powered By Footer */}
            {!isEscalated && (
                <div className="chat-powered-by">
                    Powered by RideSharePro API • Real-time data
                </div>
            )}
        </div>
    );
};

export default ChatScreen;
