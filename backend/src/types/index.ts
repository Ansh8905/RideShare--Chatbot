// ============================================================
// RideSharePro In-App Chatbot — Core Type Definitions
// BRD-compliant types for the post-booking chatbot system
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  rating?: string;
  completedRides?: number;
}

export interface BookingDetails {
  id: string;
  userId: string;
  status: 'confirmed' | 'in_progress' | 'arrived' | 'completed' | 'cancelled';
  pickupLocation: string;
  dropoffLocation: string;
  estimatedFare: number | string;
  actualFare?: number | string;
  distance?: string;
  duration?: string;
  rideType?: string;
  rideStartTime?: Date | string;
  rideEndTime?: Date | string;
  createdAt?: string;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  vehicleInfo: string;
  licensePlate?: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  eta: number; // minutes
  phone: string;
  status: 'available' | 'en_route' | 'arrived' | 'in_ride';
  completedTrips?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'bot' | 'driver' | 'support_agent';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  bookingId: string;
  userId: string;
  driverId?: string;
  supportAgentId?: string;
  messages: ChatMessage[];
  status: 'active' | 'resolved' | 'escalated' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  escalationType?: 'driver' | 'support' | 'safety';
}

export interface ChatbotRequest {
  conversationId: string;
  bookingId: string;
  userId: string;
  userInput: string;
  context?: Record<string, any>;
}

// BRD §5.2: Response must include booking context
export interface ChatbotResponse {
  conversationId: string;
  message: string;
  suggestedActions?: QuickAction[];
  requiresEscalation: boolean;
  escalationType?: 'driver' | 'support' | 'safety';
  metadata?: {
    intent: string;
    confidence: number;
    flowType: string;
    responseTimeMs?: number;
  };
  // BRD: booking context attached to every response
  bookingContext?: Record<string, any>;
}

// BRD §5.2 + §10.2: Quick actions that appear based on booking status
export type QuickAction =
  | 'where_is_driver'
  | 'driver_late'
  | 'contact_driver'
  | 'cannot_contact_driver'
  | 'cancel_booking'
  | 'payment_query'
  | 'safety_concern'
  | 'call_driver'
  | 'message_driver'
  | 'talk_to_agent'
  | 'wait'
  | 'retry'
  | 'ok_thanks'
  | 'emergency_contact';

export interface IntentResult {
  intent: string;
  confidence: number;
  entities?: Record<string, any>;
  actionType?: QuickAction;
}

export interface DecisionTreeNode {
  id: string;
  type: 'action' | 'decision' | 'escalation' | 'message';
  message?: string;
  suggestedActions?: QuickAction[];
  children?: Record<string, DecisionTreeNode>;
  escalationType?: 'driver' | 'support' | 'safety';
  condition?: (context: Record<string, any>) => Promise<boolean> | boolean;
  handler?: (context: Record<string, any>) => Promise<any>;
}

export interface SafetyEvent {
  id: string;
  conversationId: string;
  userId: string;
  driverId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  keywords: string[];
  timestamp: Date;
  status: 'detected' | 'escalated' | 'resolved';
  escalatedTo?: string;
}

export interface EscalationRequest {
  id: string;
  conversationId: string;
  bookingId: string;
  userId: string;
  escalationType: 'driver' | 'support' | 'safety';
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  context: Record<string, any>;
  // BRD §5.5.2: Chat transcript shared with agent
  chatTranscript?: ChatMessage[];
}

export interface SupportTicket {
  id: string;
  escalationRequestId: string;
  conversationId: string;
  userId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedAgent?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  // BRD: booking context visible to agent
  bookingContext?: Record<string, any>;
}

// BRD §5.2: Initiation response with full context
export interface ChatbotInitResponse {
  conversationId: string;
  message: string;
  suggestedActions: string[];
  bookingContext: {
    bookingId: string;
    status: string;
    userName: string;
    driverName: string;
    driverVehicle: string;
    driverPhone: string;
    driverRating: number;
    driverLicensePlate: string;
    eta: number;
    pickup: string;
    dropoff: string;
    estimatedFare: string;
    distance: string;
    rideType: string;
  };
}
