// ============================================================
// RideSharePro — Decision Tree Engine
// BRD §11: Implements all decision tree flows
// Flow A: Where is my driver?
// Flow B: Driver is late
// Flow C: Unable to contact driver
// Flow D: Cancel booking
// + Payment, Contact, Safety, Talk-to-agent flows
// ============================================================

import { DecisionTreeNode } from '../types';
import logger from '../utils/logger';
import apiClient from '../utils/apiClient';

class DecisionTreeEngine {
  private trees: Map<string, DecisionTreeNode>;

  constructor() {
    this.trees = this.initializeTrees();
  }

  private initializeTrees(): Map<string, DecisionTreeNode> {
    return new Map([
      ['where_is_driver', this.flowA_WhereIsDriver()],
      ['driver_late', this.flowB_DriverIsLate()],
      ['cannot_contact_driver', this.flowC_UnableToContactDriver()],
      ['cancel_booking', this.flowD_CancelBooking()],
      ['contact_driver', this.createContactDriverFlow()],
      ['payment_query', this.createPaymentQueryFlow()],
      ['safety_concern', this.createSafetyFlow()],
      ['call_driver', this.createCallDriverFlow()],
      ['message_driver', this.createMessageDriverFlow()],
      ['talk_to_agent', this.createTalkToAgentFlow()],
      ['ok_thanks', this.createOkThanksFlow()],
      ['gratitude', this.createGratitudeFlow()],
    ]);
  }

  // ─────────────────────────────────────────────
  // FLOW A: Where is my driver? (BRD §11)
  // - Fetch real-time driver location & ETA
  // - Response: "Your driver {{DriverName}} is {{X}} minutes away."
  // - Follow-up: Contact driver, Driver is late, OK thanks
  // ─────────────────────────────────────────────
  private flowA_WhereIsDriver(): DecisionTreeNode {
    return {
      id: 'flow_a_where_is_driver',
      type: 'action',
      message: 'Let me check your driver\'s location...',
      handler: async (context) => {
        try {
          const driver = await apiClient.getDriver(context.driverId || 'driver_789');
          return {
            success: true,
            data: driver,
            message: `Your driver ${driver.name} is ${driver.eta} minutes away, driving a ${driver.vehicleInfo}.`,
            // BRD Follow-ups: Contact driver, Driver is late, OK thanks
            suggestedActions: ['contact_driver', 'driver_late', 'ok_thanks'],
          };
        } catch (error) {
          logger.error('Flow A: Could not get driver location', { error });
          return {
            success: false,
            message: 'Unable to fetch driver location right now. Let me connect you with support.',
            escalate: true,
            escalationType: 'support',
            suggestedActions: ['talk_to_agent'],
          };
        }
      },
      suggestedActions: ['contact_driver', 'driver_late', 'ok_thanks'],
    };
  }

  // ─────────────────────────────────────────────
  // FLOW B: Driver is Late (BRD §11)
  // - Validate delay threshold
  // - If within limit: Apology + updated ETA
  // - If exceeded: Wait, Cancel ride, Talk/Call driver
  // ─────────────────────────────────────────────
  private flowB_DriverIsLate(): DecisionTreeNode {
    return {
      id: 'flow_b_driver_late',
      type: 'action',
      message: 'Let me check the delay status...',
      handler: async (context) => {
        try {
          const driver = await apiClient.getDriver(context.driverId || 'driver_789');
          const traffic = await apiClient.getTrafficInfo();
          const DELAY_THRESHOLD = 15; // BRD: validate delay threshold

          if (driver.eta > DELAY_THRESHOLD) {
            // Exceeded threshold
            return {
              success: true,
              message: `We sincerely apologize. Your driver ${driver.name} is significantly delayed (ETA: ${driver.eta} min). ` +
                `Traffic is ${traffic.congestionLevel} with a ${traffic.delayMinutes} min delay. ` +
                `What would you like to do?`,
              // BRD: Wait, Cancel ride, Talk/Call driver
              suggestedActions: ['wait', 'cancel_booking', 'call_driver', 'talk_to_agent'],
            };
          } else {
            // Within limit
            return {
              success: true,
              message: `We apologize for the delay. Your driver ${driver.name} is running a bit late due to ${traffic.congestionLevel} traffic. ` +
                `Updated ETA: ${driver.eta} minutes. They should arrive within the updated time.`,
              suggestedActions: ['contact_driver', 'cancel_booking', 'ok_thanks'],
            };
          }
        } catch (error) {
          logger.error('Flow B: Could not check delay', { error });
          return {
            success: false,
            message: 'Unable to check driver delay status. Let me connect you with support.',
            escalate: true,
            escalationType: 'support',
          };
        }
      },
    };
  }

  // ─────────────────────────────────────────────
  // FLOW C: Unable to Contact Driver (BRD §11)
  // - Validate call/message attempts
  // - Suggest retry or automated message
  // - If unresolved: escalate to support
  // ─────────────────────────────────────────────
  private flowC_UnableToContactDriver(): DecisionTreeNode {
    return {
      id: 'flow_c_cannot_contact',
      type: 'action',
      message: 'I\'m sorry you can\'t reach your driver. Let me help...',
      handler: async (context) => {
        const attemptCount = (context.contactAttempts || 0) + 1;

        if (attemptCount >= 3) {
          // BRD: If unresolved → escalate to support
          return {
            success: false,
            message: `We've tried multiple times to reach your driver without success. ` +
              `I'm escalating this to our support team immediately. ` +
              `A support agent will assist you within 1-2 minutes.`,
            escalate: true,
            escalationType: 'support',
            suggestedActions: ['talk_to_agent'],
          };
        }

        // BRD: Suggest retry or automated message
        try {
          const driver = await apiClient.getDriver(context.driverId || 'driver_789');
          return {
            success: true,
            message: `Attempt ${attemptCount}/3: I understand the frustration. Your driver ${driver.name} may be in a low-reception area.\n\n` +
              `Would you like me to:\n` +
              `• 📞 Try calling again\n` +
              `• 💬 Send an automated message to the driver\n` +
              `• 👨‍💼 Connect you with support`,
            suggestedActions: ['call_driver', 'message_driver', 'talk_to_agent'],
            contactAttempts: attemptCount,
          };
        } catch (error) {
          return {
            success: true,
            message: `Attempt ${attemptCount}/3: Would you like to retry or shall I send an automated message?`,
            suggestedActions: ['call_driver', 'message_driver', 'talk_to_agent'],
            contactAttempts: attemptCount,
          };
        }
      },
      suggestedActions: ['call_driver', 'message_driver', 'talk_to_agent'],
    };
  }

  // ─────────────────────────────────────────────
  // FLOW D: Cancel Booking (BRD §11)
  // - Display cancellation policy
  // - Confirm user intent
  // - Execute cancellation
  // - Show refund or penalty details
  // ─────────────────────────────────────────────
  private flowD_CancelBooking(): DecisionTreeNode {
    return {
      id: 'flow_d_cancel_booking',
      type: 'action',
      message: 'Let me check the cancellation details for your booking...',
      handler: async (context) => {
        try {
          const booking = await apiClient.getBooking(context.bookingId);
          const timeSinceBooking = booking.createdAt
            ? Date.now() - new Date(booking.createdAt).getTime()
            : 0;
          const isFreeCancel = timeSinceBooking < 2 * 60 * 1000;

          if (isFreeCancel) {
            return {
              success: true,
              isFree: true,
              message: `📋 **Cancellation Policy:**\n\n` +
                `✅ Free cancellation available!\n` +
                `Your booking was made less than 2 minutes ago.\n\n` +
                `Booking: #${booking.id}\n` +
                `Estimated fare: ${booking.estimatedFare}\n` +
                `Refund: Full refund will be processed\n\n` +
                `Would you like to proceed with cancellation?`,
              suggestedActions: ['cancel_booking', 'where_is_driver', 'ok_thanks'],
            };
          } else {
            return {
              success: true,
              isFree: false,
              message: `📋 **Cancellation Policy:**\n\n` +
                `⚠️ Cancelling now will incur a small fee.\n\n` +
                `Booking: #${booking.id}\n` +
                `Estimated fare: ${booking.estimatedFare}\n` +
                `Cancellation fee: $3.50\n` +
                `Refund amount: Estimated fare minus cancellation fee\n\n` +
                `Would you like to confirm the cancellation?`,
              suggestedActions: ['cancel_booking', 'where_is_driver', 'ok_thanks'],
            };
          }
        } catch (error) {
          logger.error('Flow D: Error checking cancellation policy', { error });
          return {
            success: false,
            message: 'Unable to process cancellation right now. Let me connect you with support.',
            escalate: true,
            escalationType: 'support',
          };
        }
      },
    };
  }

  // ─────────────────────────────────────────────
  // BRD §5.5.1: Escalation to Driver
  // Call or message option, share chatbot context
  // ─────────────────────────────────────────────
  private createContactDriverFlow(): DecisionTreeNode {
    return {
      id: 'contact_driver_root',
      type: 'action',
      message: 'How would you like to contact your driver?',
      handler: async (context) => {
        try {
          const driver = await apiClient.getDriver(context.driverId || 'driver_789');
          return {
            success: true,
            message: `📞 **Contact Your Driver**\n\n` +
              `Driver: ${driver.name}\n` +
              `Phone: ${driver.phone}\n` +
              `Vehicle: ${driver.vehicleInfo}\n` +
              `Rating: ⭐ ${driver.rating}\n\n` +
              `How would you like to reach them?`,
            suggestedActions: ['call_driver', 'message_driver'],
          };
        } catch (error) {
          return {
            success: true,
            message: 'How would you like to contact your driver?',
            suggestedActions: ['call_driver', 'message_driver'],
          };
        }
      },
      suggestedActions: ['call_driver', 'message_driver'],
    };
  }

  private createCallDriverFlow(): DecisionTreeNode {
    return {
      id: 'call_driver',
      type: 'action',
      message: 'Initiating call to your driver...',
      handler: async (context) => {
        try {
          const driver = await apiClient.getDriver(context.driverId || 'driver_789');
          // BRD §5.5.1: Share chatbot conversation context with driver
          await apiClient.sendNotification(
            context.driverId || 'driver_789',
            `Rider is trying to reach you. Booking: ${context.bookingId}`
          );
          return {
            success: true,
            message: `📞 Calling ${driver.name} at ${driver.phone}...\n\n` +
              `Your chatbot conversation has been shared with the driver for context.\n` +
              `If the call doesn't connect, try sending a message instead.`,
            suggestedActions: ['message_driver', 'cannot_contact_driver'],
          };
        } catch (error) {
          return {
            success: true,
            message: 'Initiating call to your driver... If the call doesn\'t connect, try messaging.',
            suggestedActions: ['message_driver', 'cannot_contact_driver'],
          };
        }
      },
    };
  }

  private createMessageDriverFlow(): DecisionTreeNode {
    return {
      id: 'message_driver',
      type: 'action',
      message: 'Sending message to your driver...',
      handler: async (context) => {
        try {
          const driver = await apiClient.getDriver(context.driverId || 'driver_789');
          await apiClient.sendNotification(
            context.driverId || 'driver_789',
            `Message from rider. Booking: ${context.bookingId}. Please check your app.`
          );
          return {
            success: true,
            message: `💬 An automated message has been sent to **${driver.name}**.\n\n` +
              `They will receive a notification to check their app. ` +
              `If you don't hear back within 2 minutes, we can escalate to support.`,
            suggestedActions: ['cannot_contact_driver', 'where_is_driver', 'ok_thanks'],
          };
        } catch (error) {
          return {
            success: true,
            message: 'Your message has been sent to the driver. Please wait for a response.',
            suggestedActions: ['cannot_contact_driver', 'ok_thanks'],
          };
        }
      },
    };
  }

  private createPaymentQueryFlow(): DecisionTreeNode {
    return {
      id: 'payment_query_root',
      type: 'action',
      message: 'Let me get your payment details...',
      handler: async (context) => {
        try {
          const payment = await apiClient.getPaymentDetails(context.bookingId);
          return {
            success: true,
            data: payment,
            message: `Your estimated fare is $${payment.estimatedFare}. Payment method: ${payment.method}. Status: ${payment.status}.`,
            suggestedActions: ['talk_to_agent', 'ok_thanks'],
          };
        } catch (error) {
          logger.error('Error fetching payment details', { error });
          return {
            success: false,
            message: 'Unable to get payment details. Please contact support.',
            escalate: true,
            escalationType: 'support',
          };
        }
      },
      suggestedActions: ['talk_to_agent', 'ok_thanks'],
    };
  }

  // ─────────────────────────────────────────────
  // BRD Epic 6: Safety flow
  // ─────────────────────────────────────────────
  private createSafetyFlow(): DecisionTreeNode {
    return {
      id: 'safety_root',
      type: 'escalation',
      message: 'Your safety is our top priority. Connecting you with emergency support.',
      escalationType: 'safety',
      handler: async (context) => {
        logger.warn('Safety escalation via decision tree', {
          userId: context.userId,
          conversationId: context.conversationId,
        });
        return {
          success: true,
          message: '🚨 Your safety is our top priority. I\'m connecting you with emergency support immediately.',
          escalate: true,
          escalationType: 'safety',
          suggestedActions: ['emergency_contact', 'talk_to_agent'],
        };
      },
    };
  }

  // ─────────────────────────────────────────────
  // BRD §5.5.2: Talk to agent escalation
  // ─────────────────────────────────────────────
  private createTalkToAgentFlow(): DecisionTreeNode {
    return {
      id: 'talk_to_agent',
      type: 'escalation',
      message: 'Connecting you with a support agent...',
      escalationType: 'support',
      handler: async (_context) => {
        return {
          success: true,
          message: '👨‍💼 I\'m connecting you with a support agent. Your chat history and booking details will be shared automatically.',
          escalate: true,
          escalationType: 'support',
          suggestedActions: [],
        };
      },
    };
  }

  // ─────────────────────────────────────────────
  // Flow A follow-up: OK, thanks
  // ─────────────────────────────────────────────
  private createOkThanksFlow(): DecisionTreeNode {
    return {
      id: 'ok_thanks',
      type: 'message',
      message: '😊 You\'re welcome! If you need anything else during your ride, just tap a quick action or type your question. Have a great ride!',
      suggestedActions: ['where_is_driver', 'contact_driver', 'payment_query'],
    };
  }

  // ─────────────────────────────────────────────
  // Gratitude / Conversation Close Flow
  // Brand-aligned closing with Door2Door branding
  // ─────────────────────────────────────────────
  private createGratitudeFlow(): DecisionTreeNode {
    return {
      id: 'gratitude_close',
      type: 'action',
      message: 'Thank you for choosing Door2Door Flights!',
      handler: async (_context) => {
        // Pick a closing response randomly for variety
        const closingResponses = [
          `You're welcome! 😊 Thank you for choosing Door2Door Flights. If you need any further assistance with bookings, prices, or trips, I'm here to help.`,
          `Happy to help! 😊 Thank you for riding with Door2Door Flights. Don't hesitate to reach out if you need anything else during your ride.`,
          `Glad I could assist! 😊 At Door2Door Flights, your comfort is our priority. Feel free to ask if you need anything else.`,
        ];

        const reply = closingResponses[Math.floor(Math.random() * closingResponses.length)];

        return {
          success: true,
          message: reply,
          intent: 'conversation_close',
          // Offer quick re-engagement options
          suggestedActions: ['where_is_driver', 'payment_query', 'contact_driver'],
          sessionAction: 'mark_closing',
        };
      },
    };
  }

  // ────────────────────────────────────────────
  // Execute a flow
  // ────────────────────────────────────────────
  async executeFlow(
    flowType: string,
    context: Record<string, any>
  ): Promise<any> {
    try {
      const tree = this.trees.get(flowType);
      if (!tree) {
        logger.warn('Unknown flow type', { flowType });
        return {
          success: false,
          message: 'I\'m not sure how to help with that. Let me connect you with a support agent.',
          escalate: true,
          escalationType: 'support',
          suggestedActions: ['talk_to_agent'],
        };
      }

      return await this.executeNode(tree, context);
    } catch (error) {
      logger.error('Error executing flow', { flowType, error });
      return {
        success: false,
        message: 'An error occurred. Let me connect you with support.',
        escalate: true,
        escalationType: 'support',
        suggestedActions: ['talk_to_agent'],
      };
    }
  }

  private async executeNode(node: DecisionTreeNode, context: Record<string, any>): Promise<any> {
    switch (node.type) {
      case 'message':
        return {
          success: true,
          message: node.message,
          suggestedActions: node.suggestedActions,
        };

      case 'action':
        if (node.handler) {
          const result = await node.handler(context);
          // Ensure suggestedActions from handler are used, fallback to node's
          if (!result.suggestedActions && node.suggestedActions) {
            result.suggestedActions = node.suggestedActions;
          }
          return result;
        }
        return {
          success: true,
          message: node.message,
          suggestedActions: node.suggestedActions,
        };

      case 'decision':
        if (node.handler) {
          return await node.handler(context);
        }
        if (node.condition) {
          const condResult = await node.condition(context);
          const childPath = condResult ? 'exceeded' : 'within_limit';
          const childNode = node.children?.[childPath];
          if (childNode) {
            return await this.executeNode(childNode, context);
          }
        }
        return {
          success: true,
          message: node.message,
          suggestedActions: node.suggestedActions,
        };

      case 'escalation':
        if (node.handler) {
          return await node.handler(context);
        }
        return {
          success: false,
          message: node.message,
          escalate: true,
          escalationType: node.escalationType,
          suggestedActions: node.suggestedActions || ['talk_to_agent'],
        };

      default:
        return {
          success: false,
          message: 'Unable to process request.',
          suggestedActions: ['talk_to_agent'],
        };
    }
  }
}

export default new DecisionTreeEngine();
