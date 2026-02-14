// ============================================================
// RideSharePro Frontend — Type Definitions
// ============================================================

export interface Message {
  id: string;
  sender: 'user' | 'bot' | 'driver' | 'support_agent';
  text: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface QuickActionButton {
  id: string;
  label: string;
  action: string;
  icon?: string;
}

export interface BookingContext {
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
}

export interface ChatbotState {
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isEscalated: boolean;
  escalationType?: 'driver' | 'support' | 'safety';
  bookingContext: BookingContext | null;
}

export interface ChatbotProps {
  bookingId: string;
  userId: string;
  driverId?: string;
  apiUrl: string;
  onEscalation?: (escalationType: string) => void;
  onClose?: () => void;
}
