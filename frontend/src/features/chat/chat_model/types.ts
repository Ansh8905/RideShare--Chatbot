// ============================================================
// BRD-Compliant Type Definitions for RideSharePro Chatbot
// Supports: Booking Context, Quick Actions, Escalation
// ============================================================

// BRD §5.2: Booking Context
export interface BookingContext {
    bookingId: string;
    status: string;
    driverName?: string;
    driverVehicle?: string;
    driverPhone?: string;
    eta?: number;
    estimatedFare?: string;
    pickup: string;
    dropoff: string;
}

// BRD Epic 3: Quick Actions
export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    action: string;
    variant?: 'primary' | 'danger' | 'warning';
}

// Chat Message (BRD §5.4: Interaction Types)
export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot' | 'driver' | 'support_agent';
    timestamp: Date;
    intent?: string;
    metadata?: Record<string, any>;
}

// API Request for Chat
export interface ChatRequest {
    userId: string;
    message: string;
    bookingId?: string;
    conversationId?: string;
}

// API Response from Chat (BRD-compliant)
export interface ChatResponse {
    success: boolean;
    reply?: string;
    message?: string;
    intent?: string;
    timestamp: string;
    suggestedActions?: string[];
    bookingContext?: BookingContext;
    requiresEscalation?: boolean;
    escalationType?: 'driver' | 'support' | 'safety';
    metadata?: Record<string, any>;
}

// BRD Epic 5: Escalation
export interface EscalationRequest {
    conversationId: string;
    escalationType: 'driver' | 'support' | 'safety';
    reason?: string;
}

// Chatbot Initialization Response
export interface InitResponse {
    conversationId: string;
    message: string;
    suggestedActions?: string[];
    bookingContext?: BookingContext;
}
