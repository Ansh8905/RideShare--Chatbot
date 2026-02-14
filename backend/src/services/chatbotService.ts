// ============================================================
// RideSharePro — Chatbot Service
// BRD-compliant orchestrator for in-app chatbot
// Handles: greeting, message processing, context, escalation
// ============================================================

import { ChatbotRequest, ChatbotResponse } from '../types';
import logger from '../utils/logger';
import intentDetector from '../nlp/intentDetector';
import decisionTreeEngine from '../decisionTree/engine';
import safetyDetectionService from './safetyDetection';
import { conversationService, escalationService } from './conversationService';
import apiClient from '../utils/apiClient';

class ChatbotService {

  // ────────────────────────────────────────────
  // BRD §5.2: Context-aware greeting
  // Must include: UserName, BookingID, RideStatus,
  // Driver details, ETA
  // ────────────────────────────────────────────
  async getGreeting(
    _conversationId: string,
    bookingId: string,
    userId: string
  ): Promise<{
    message: string;
    bookingContext: Record<string, any>;
  }> {
    try {
      const booking = await apiClient.getBooking(bookingId);
      const driver = booking.driverId ? await apiClient.getDriver(booking.driverId) : null;
      const user = await apiClient.getUserProfile(userId);

      const userName = user?.name || 'there';
      const driverName = driver?.name || 'your driver';
      const eta = driver?.eta || 'a few';
      const vehicle = driver?.vehicleInfo || 'their vehicle';
      const plate = driver?.licensePlate || '';
      const rideStatus = booking.status || 'confirmed';

      // BRD greeting format: "Hi {{UserName}} 👋 I'm here to help you with your current ride."
      const greeting = `Hi ${userName} 👋 I'm here to help you with your current ride.\n\n` +
        `🚗 **Ride Status:** ${this.formatStatus(rideStatus)}\n` +
        `👤 **Driver:** ${driverName}\n` +
        `🚙 **Vehicle:** ${vehicle}${plate ? ` (${plate})` : ''}\n` +
        `⏱️ **ETA:** ${eta} minutes\n` +
        `📍 ${booking.pickupLocation || '123 Main St'} → ${booking.dropoffLocation || '456 Oak Ave'}\n\n` +
        `How can I assist you?`;

      const bookingContext = {
        bookingId,
        status: rideStatus,
        userName,
        driverName,
        driverVehicle: vehicle,
        driverPhone: driver?.phone || '',
        driverRating: driver?.rating || 0,
        driverLicensePlate: plate,
        eta: driver?.eta || 0,
        pickup: booking.pickupLocation || '123 Main St',
        dropoff: booking.dropoffLocation || '456 Oak Ave',
        estimatedFare: String(booking.estimatedFare || '$24.50'),
        distance: String(booking.distance || '8.3 km'),
        rideType: booking.rideType || 'comfort',
      };

      return { message: greeting, bookingContext };
    } catch (error) {
      logger.error('Error generating greeting', { error });
      return {
        message: `Hi there 👋 I'm here to help you with your current ride. How can I assist you?`,
        bookingContext: {
          bookingId,
          status: 'confirmed',
          userName: 'Guest',
          driverName: 'Your driver',
          driverVehicle: '',
          driverPhone: '',
          driverRating: 0,
          driverLicensePlate: '',
          eta: 0,
          pickup: '',
          dropoff: '',
          estimatedFare: '',
          distance: '',
          rideType: '',
        },
      };
    }
  }

  // ────────────────────────────────────────────
  // BRD §5.3/#10.2: Quick actions based on booking status
  // Options change based on booking status
  // ────────────────────────────────────────────
  async getQuickActions(bookingStatus?: string): Promise<string[]> {
    switch (bookingStatus) {
      case 'confirmed':
        // Driver assigned but not yet en route
        return [
          'where_is_driver',
          'driver_late',
          'contact_driver',
          'cancel_booking',
          'payment_query',
          'talk_to_agent',
        ];
      case 'in_progress':
        // Driver is en route / ride is active
        return [
          'where_is_driver',
          'driver_late',
          'contact_driver',
          'cannot_contact_driver',
          'safety_concern',
          'payment_query',
          'talk_to_agent',
        ];
      case 'arrived':
        // Driver arrived at pickup
        return [
          'contact_driver',
          'cannot_contact_driver',
          'cancel_booking',
          'payment_query',
          'safety_concern',
          'talk_to_agent',
        ];
      case 'completed':
        // Ride completed — only post-ride options
        return [
          'payment_query',
          'safety_concern',
          'talk_to_agent',
        ];
      case 'cancelled':
        return [
          'payment_query',
          'talk_to_agent',
        ];
      default:
        return [
          'where_is_driver',
          'driver_late',
          'contact_driver',
          'cannot_contact_driver',
          'cancel_booking',
          'payment_query',
          'talk_to_agent',
        ];
    }
  }

  // ────────────────────────────────────────────
  // Core: Process user message (BRD §5.3, §5.4)
  // NLP detection → Decision tree → API data enrichment
  // ────────────────────────────────────────────
  async processMessage(request: ChatbotRequest): Promise<ChatbotResponse> {
    const startTime = Date.now();

    try {
      const { conversationId, bookingId, userId, userInput } = request;

      // ── 1. Safety check first (BRD §Epic 6) ──
      const safetyEvent = safetyDetectionService.detectSafetyConcerns(
        userInput,
        conversationId,
        userId,
        request.context?.driverId
      );

      if (safetyEvent && safetyDetectionService.isEscalationRequired(safetyEvent)) {
        return await this.handleSafetyEscalation(
          safetyEvent, conversationId, bookingId, userId, userInput, startTime
        );
      }

      // ── 2. Add user message to conversation ──
      await conversationService.addMessage(conversationId, 'user', userInput);

      // ── 3. Detect intent (BRD §Epic 4: NLP, <2s response) ──
      const intentResult = await intentDetector.detectIntent(userInput);

      logger.info('Intent detected', {
        conversationId,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
      });

      // ── 4. Fetch booking + driver context (BRD §5.2) ──
      const conversation = await conversationService.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      let bookingDetails: any;
      let driverDetails: any;
      let trafficInfo: any;

      try {
        bookingDetails = await apiClient.getBooking(bookingId);
        if (bookingDetails.driverId) {
          driverDetails = await apiClient.getDriver(bookingDetails.driverId);
        }
        trafficInfo = await apiClient.getTrafficInfo();
      } catch (error) {
        logger.warn('Could not fetch context data', { error });
      }

      // ── 5. Execute decision tree (BRD §11: Decision Tree Flows) ──
      const executionContext = {
        ...request.context,
        bookingId,
        userId,
        conversationId,
        userInput,
        intent: intentResult.intent,
        bookingDetails,
        driverId: driverDetails?.id || request.context?.driverId,
        driverDetails,
        trafficInfo,
      };

      let flowResult: any;
      if (intentResult.intent !== 'unknown') {
        flowResult = await decisionTreeEngine.executeFlow(intentResult.intent, executionContext);
      } else {
        flowResult = {
          success: true,
          message: `I'm not sure I understood that. Here's what I can help you with:\n` +
            `• 📍 Where is my driver\n` +
            `• ⏰ Driver is late\n` +
            `• 📞 Contact driver\n` +
            `• 🚫 Cancel booking\n` +
            `• 💳 Payment questions\n` +
            `• ⚠️ Safety concerns\n\n` +
            `Please try asking one of these, or tap a quick action below.`,
          suggestedActions: ['where_is_driver', 'contact_driver', 'payment_query', 'talk_to_agent'],
        };
      }

      // ── 6. Enrich response with live API data (BRD §5.2, §11) ──
      let botMessage = this.enrichResponse(
        intentResult.intent,
        flowResult,
        driverDetails,
        bookingDetails,
        trafficInfo,
        bookingId
      );

      // ── 7. Determine escalation ──
      let requiresEscalation = flowResult.escalate === true;
      let escalationType: 'driver' | 'support' | 'safety' | undefined = flowResult.escalationType;

      // Only escalate for very low confidence (<0.3) — BRD says chatbot should resolve most
      if (
        !requiresEscalation &&
        intentResult.confidence < 0.3 &&
        intentResult.intent !== 'unknown'
      ) {
        requiresEscalation = true;
        escalationType = 'support';
        botMessage += '\n\n🤔 I\'m not fully confident I understood your request. Would you like me to connect you with a support agent?';
      }

      // ── 8. Add bot response to conversation ──
      await conversationService.addMessage(conversationId, 'bot', botMessage, {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        flowType: intentResult.intent,
        escalated: requiresEscalation,
        responseTimeMs: Date.now() - startTime,
      });

      // ── 9. Handle escalation with transcript (BRD §5.5, Epic 5) ──
      if (requiresEscalation && escalationType) {
        await this.handleEscalation(
          conversationId, bookingId, userId, escalationType,
          intentResult.intent, executionContext, driverDetails
        );
      }

      // ── 10. Build final response with booking context ──
      const responseTimeMs = Date.now() - startTime;

      // BRD §5.3: Quick actions based on booking status
      const statusBasedActions = flowResult.suggestedActions ||
        await this.getQuickActions(bookingDetails?.status);

      const response: ChatbotResponse = {
        conversationId,
        message: botMessage,
        suggestedActions: statusBasedActions,
        requiresEscalation,
        escalationType,
        metadata: {
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          flowType: intentResult.intent,
          responseTimeMs,
        },
        bookingContext: this.buildBookingContext(bookingDetails, driverDetails),
      };

      logger.info('Message processed', {
        conversationId,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        escalated: requiresEscalation,
        responseTimeMs,
      });

      return response;
    } catch (error) {
      return await this.handleErrorWithEscalation(request, error, startTime);
    }
  }

  // ────────────────────────────────────────────
  // BRD §11: Enrich responses with live API data
  // Each flow gets contextual, data-driven answers
  // ────────────────────────────────────────────
  private enrichResponse(
    intent: string,
    flowResult: any,
    driverDetails: any,
    bookingDetails: any,
    trafficInfo: any,
    bookingId: string
  ): string {
    // If the flow already escalated, don't override the message
    if (flowResult.escalate) return flowResult.message;

    switch (intent) {
      // ── Flow A: Where is my driver? (BRD §11) ──
      case 'where_is_driver': {
        if (!driverDetails) return flowResult.message;
        let msg = `📍 Your driver **${driverDetails.name}** is currently **${driverDetails.eta} minutes** away.\n` +
          `🚙 Vehicle: ${driverDetails.vehicleInfo}${driverDetails.licensePlate ? ` (${driverDetails.licensePlate})` : ''}\n` +
          `📌 Current location: (${driverDetails.currentLocation.lat.toFixed(4)}, ${driverDetails.currentLocation.lng.toFixed(4)})`;
        if (trafficInfo) {
          msg += `\n🚦 Traffic: ${trafficInfo.congestionLevel} — avg speed ${trafficInfo.averageSpeed}`;
          if (trafficInfo.delayMinutes > 0) {
            msg += ` (+${trafficInfo.delayMinutes} min delay)`;
          }
        }
        return msg;
      }

      // ── Flow B: Driver is late (BRD §11) ──
      case 'driver_late': {
        if (!driverDetails) return flowResult.message;
        const isSignificantDelay = driverDetails.eta > 15;
        if (isSignificantDelay) {
          return `⚠️ We apologize for the significant delay. Your driver **${driverDetails.name}** now has an updated ETA of **${driverDetails.eta} minutes**.\n\n` +
            `Traffic conditions are currently **${trafficInfo?.congestionLevel || 'moderate'}** with a ${trafficInfo?.delayMinutes || 0} min delay.\n\n` +
            `What would you like to do?\n` +
            `• ⏳ Wait for the driver\n` +
            `• 🚫 Cancel the ride\n` +
            `• 📞 Talk/Call driver`;
        } else {
          return `😊 We apologize for the short delay. Your driver **${driverDetails.name}** is running a bit late due to traffic.\n\n` +
            `Updated ETA: **${driverDetails.eta} minutes**\n` +
            `Traffic: ${trafficInfo?.congestionLevel || 'moderate'} conditions\n\n` +
            `They should arrive within the updated time.`;
        }
      }

      // ── Flow D: Cancel booking (BRD §11) ──
      case 'cancel_booking': {
        if (!bookingDetails) return flowResult.message;
        const timeSinceCreation = bookingDetails.createdAt
          ? Date.now() - new Date(bookingDetails.createdAt).getTime()
          : 0;
        const isFreeCancel = timeSinceCreation < 2 * 60 * 1000;

        if (isFreeCancel) {
          return `📋 **Cancellation Policy**\n\n` +
            `✅ Free cancellation is available since your booking was made less than 2 minutes ago.\n\n` +
            `Booking: #${bookingDetails.id}\n` +
            `Estimated fare: ${bookingDetails.estimatedFare}\n\n` +
            `Would you like to proceed with cancellation?`;
        } else {
          return `📋 **Cancellation Policy**\n\n` +
            `⚠️ Cancelling at this point may incur a small cancellation fee.\n\n` +
            `Booking: #${bookingDetails.id}\n` +
            `Estimated fare: ${bookingDetails.estimatedFare}\n` +
            `Cancellation fee: ~$3.50\n\n` +
            `Would you like to confirm the cancellation, or keep your booking?`;
        }
      }

      // ── Contact driver (BRD §5.5.1) ──
      case 'contact_driver': {
        if (!driverDetails) return flowResult.message;
        return `📞 **Contact Your Driver**\n\n` +
          `Driver: ${driverDetails.name}\n` +
          `Phone: ${driverDetails.phone}\n` +
          `Vehicle: ${driverDetails.vehicleInfo}${driverDetails.licensePlate ? ` (${driverDetails.licensePlate})` : ''}\n` +
          `Rating: ⭐ ${driverDetails.rating}\n\n` +
          `How would you like to reach them?`;
      }

      // ── Payment query ──
      case 'payment_query': {
        if (!bookingDetails) return flowResult.message;
        // Get payment details inline
        const fare = bookingDetails.estimatedFare || '$24.50';
        const dist = bookingDetails.distance || '8.3 km';
        return `💳 **Fare Details**\n\n` +
          `Booking: #${bookingDetails.id}\n` +
          `Estimated fare: **${fare}**\n` +
          `Distance: ${dist}\n` +
          `Ride type: ${bookingDetails.rideType || 'comfort'}\n\n` +
          `📊 **Breakdown:**\n` +
          `• Base fare: $3.50\n` +
          `• Distance charge: $12.00\n` +
          `• Time charge: $6.00\n` +
          `• Service fee: $3.00\n\n` +
          `Final fare may vary based on actual distance and time.`;
      }

      // ── Talk to agent (BRD §5.5.2) ──
      case 'talk_to_agent': {
        return `👨‍💼 **Connecting to Support**\n\n` +
          `I'm connecting you with a human support agent. Your chat history and booking context will be shared with them automatically.\n\n` +
          `⏳ Estimated wait: 1-2 minutes\n` +
          `📋 Ticket created for your issue.`;
      }

      default:
        return flowResult.message;
    }
  }

  // ────────────────────────────────────────────
  // BRD §5.5.2/Epic 5: Escalation with transcript
  // Chat transcript shared automatically with agent
  // ────────────────────────────────────────────
  private async handleEscalation(
    conversationId: string,
    bookingId: string,
    userId: string,
    escalationType: 'driver' | 'support' | 'safety',
    intent: string,
    executionContext: any,
    driverDetails: any
  ): Promise<void> {
    // Get full chat transcript for the agent
    const messages = await conversationService.getMessages(conversationId);

    const escalationRequest = await escalationService.createEscalationRequest(
      conversationId,
      bookingId,
      userId,
      escalationType,
      `User needs ${escalationType} assistance. Intent: ${intent}`,
      {
        ...executionContext,
        chatTranscript: messages,  // BRD: transcript shared
      }
    );

    const ticket = await escalationService.createSupportTicket(
      escalationRequest.id,
      conversationId,
      userId
    );

    await conversationService.escalateConversation(
      conversationId,
      escalationType,
      escalationType === 'driver' ? driverDetails?.id : undefined,
      escalationType === 'support' ? ticket.id : undefined
    );
  }

  // ────────────────────────────────────────────
  // BRD Epic 6: Safety escalation with emergency
  // Priority handling + emergency contact option
  // ────────────────────────────────────────────
  private async handleSafetyEscalation(
    safetyEvent: any,
    conversationId: string,
    bookingId: string,
    userId: string,
    userInput: string,
    startTime: number
  ): Promise<ChatbotResponse> {
    logger.warn('Safety escalation triggered', { safetyEvent });

    await conversationService.addMessage(conversationId, 'user', userInput, {
      intent: 'safety_concern',
      safetyKeywords: safetyEvent.keywords,
    });

    // Get chat transcript
    const messages = await conversationService.getMessages(conversationId);

    const escalationRequest = await escalationService.createEscalationRequest(
      conversationId,
      bookingId,
      userId,
      'safety',
      `URGENT Safety concern detected: ${safetyEvent.keywords.join(', ')}`,
      { safetyEvent, userInput, severity: safetyEvent.severity, chatTranscript: messages }
    );

    const ticket = await escalationService.createSupportTicket(
      escalationRequest.id,
      conversationId,
      userId
    );

    await conversationService.escalateConversation(
      conversationId,
      'safety',
      undefined,
      ticket.id
    );

    // BRD Epic 6: Emergency contact + priority handling
    const safetyResponse =
      `🚨 **Your safety is our top priority.**\n\n` +
      `I'm connecting you with emergency support immediately.\n\n` +
      `📞 **Emergency Contacts:**\n` +
      `• RideSharePro Safety: 1-800-SAFE-RIDE\n` +
      `• Local Emergency: 911\n\n` +
      `🎫 Support Ticket: #${ticket.id.substring(0, 8).toUpperCase()}\n` +
      `Priority: **CRITICAL**\n\n` +
      `Please stay in a public, well-lit area if possible. Help is on the way.`;

    await conversationService.addMessage(conversationId, 'bot', safetyResponse, {
      intent: 'safety_concern',
      escalated: true,
      ticketId: ticket.id,
      priority: 'critical',
    });

    return {
      conversationId,
      message: safetyResponse,
      suggestedActions: ['emergency_contact', 'talk_to_agent'],
      requiresEscalation: true,
      escalationType: 'safety',
      metadata: {
        intent: 'safety_concern',
        confidence: 1.0,
        flowType: 'safety_escalation',
        responseTimeMs: Date.now() - startTime,
      },
    };
  }

  // ────────────────────────────────────────────
  // Error handling with auto-escalation
  // ────────────────────────────────────────────
  private async handleErrorWithEscalation(
    request: ChatbotRequest,
    error: any,
    startTime: number
  ): Promise<ChatbotResponse> {
    const responseTimeMs = Date.now() - startTime;
    logger.error('Error processing message', { error, request, responseTimeMs });

    const errorMessage = '⚠️ I encountered an error processing your request. Let me connect you with a support agent who can help right away.';

    await conversationService.addMessage(request.conversationId, 'bot', errorMessage);

    // Get transcript for escalation
    const messages = await conversationService.getMessages(request.conversationId);

    const escalationRequest = await escalationService.createEscalationRequest(
      request.conversationId,
      request.bookingId,
      request.userId,
      'support',
      `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { chatTranscript: messages }
    );

    const ticket = await escalationService.createSupportTicket(
      escalationRequest.id,
      request.conversationId,
      request.userId
    );

    await conversationService.escalateConversation(
      request.conversationId,
      'support',
      undefined,
      ticket.id
    );

    return {
      conversationId: request.conversationId,
      message: errorMessage,
      suggestedActions: ['talk_to_agent'],
      requiresEscalation: true,
      escalationType: 'support',
      metadata: {
        intent: 'error',
        confidence: 0,
        flowType: 'error_escalation',
        responseTimeMs,
      },
    };
  }

  // ────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────
  private buildBookingContext(bookingDetails: any, driverDetails: any): Record<string, any> {
    return {
      bookingId: bookingDetails?.id || '',
      status: bookingDetails?.status || 'confirmed',
      driverName: driverDetails?.name || '',
      driverVehicle: driverDetails?.vehicleInfo || '',
      driverPhone: driverDetails?.phone || '',
      driverRating: driverDetails?.rating || 0,
      eta: driverDetails?.eta || 0,
      pickup: bookingDetails?.pickupLocation || '',
      dropoff: bookingDetails?.dropoffLocation || '',
      estimatedFare: String(bookingDetails?.estimatedFare || ''),
      distance: String(bookingDetails?.distance || ''),
    };
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      confirmed: '✅ Confirmed',
      in_progress: '🚗 In Progress',
      arrived: '📍 Driver Arrived',
      completed: '🏁 Completed',
      cancelled: '❌ Cancelled',
    };
    return statusMap[status] || status;
  }
}

export default new ChatbotService();
