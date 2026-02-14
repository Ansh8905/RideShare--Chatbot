import React from 'react';
import { ChatMessage, BookingContext, QuickAction } from '../chat_model/types';
import './widgets.css';

// ============================================================
// Message Bubble Component
// ============================================================
interface MessageBubbleProps {
    message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
        <div className={`chat-bubble-container ${isUser ? 'user' : 'bot'}`}>
            <div className={`chat-bubble ${isUser ? 'user-bg' : 'bot-bg'}`}>
                <p className="chat-text">{message.text}</p>
                <span className="chat-timestamp">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
};

// ============================================================
// Typing Indicator Component
// ============================================================
export const TypingIndicator: React.FC = () => (
    <div className="chat-bubble-container bot">
        <div className="chat-bubble bot-bg loading-bubble">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
        </div>
    </div>
);

// ============================================================
// Chat Input Component
// ============================================================
interface ChatInputProps {
    onSend: (text: string) => void;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
    const [text, setText] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text);
            setText('');
        }
    };

    return (
        <form className="chat-input-container" onSubmit={handleSubmit}>
            <input
                type="text"
                className="chat-input-field"
                placeholder="Type your question about this ride..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={disabled}
            />
            <button type="submit" className="chat-send-btn" disabled={!text.trim() || disabled}>
                ➤
            </button>
        </form>
    );
};

// ============================================================
// BRD §5.2: Booking Context Display
// ============================================================
interface BookingContextBarProps {
    context: BookingContext;
}

export const BookingContextBar: React.FC<BookingContextBarProps> = ({ context }) => {
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

    const badge = getStatusBadge(context.status);

    return (
        <div className="booking-context-bar">
            <div className="context-row">
                <span className="context-label">🚗 Ride</span>
                <span className={`context-status ${badge.className}`}>{badge.label}</span>
            </div>
            {context.driverName && (
                <div className="context-row">
                    <span className="context-detail">
                        👤 {context.driverName} • {context.driverVehicle}
                    </span>
                </div>
            )}
            {context.eta && (
                <div className="context-row">
                    <span className="context-detail">
                        ⏱️ ETA: {context.eta} min • 💰 {context.estimatedFare}
                    </span>
                </div>
            )}
            <div className="context-route">
                <span>📍 {context.pickup}</span>
                <span className="route-arrow">→</span>
                <span>🏁 {context.dropoff}</span>
            </div>
        </div>
    );
};

// ============================================================
// BRD Epic 3: Quick Action Buttons
// ============================================================
interface QuickActionsProps {
    actions: QuickAction[];
    onActionClick: (action: string) => void;
    disabled?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, onActionClick, disabled }) => {
    if (actions.length === 0) return null;

    return (
        <div className="quick-actions">
            {actions.map((action) => (
                <button
                    key={action.id}
                    className={`quick-action-btn ${action.variant === 'danger' ? 'btn-danger' : action.variant === 'warning' ? 'btn-warning' : ''}`}
                    onClick={() => onActionClick(action.action)}
                    disabled={disabled}
                >
                    <span className="qa-icon">{action.icon}</span>
                    <span className="qa-label">{action.label}</span>
                </button>
            ))}
        </div>
    );
};

// ============================================================
// BRD §5.5: Escalation Notice
// ============================================================
interface EscalationNoticeProps {
    type: 'driver' | 'support' | 'safety';
}

export const EscalationNotice: React.FC<EscalationNoticeProps> = ({ type }) => {
    return (
        <div className={`escalation-notice escalation-${type}`}>
            {type === 'safety' ? (
                <p>
                    🚨 <strong>Safety Alert:</strong> Your issue has been escalated with CRITICAL priority.
                    Emergency support is being dispatched. Call <strong>911</strong> if in immediate danger.
                </p>
            ) : type === 'driver' ? (
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
    );
};
