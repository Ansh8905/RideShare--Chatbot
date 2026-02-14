import { IntentResult, QuickAction } from '../types';
import logger from '../utils/logger';
import config from '../config';

const { BayesClassifier } = require('natural');

class NLPService {
  private classifier: any;
  private intents: Map<string, QuickAction>;

  constructor() {
    this.intents = this.initializeIntents();
    this.classifier = this.trainClassifier();
  }

  private initializeIntents(): Map<string, QuickAction> {
    return new Map([
      ['where_is_driver', 'where_is_driver'],
      ['driver_late', 'driver_late'],
      ['contact_driver', 'contact_driver'],
      ['cannot_contact_driver', 'cannot_contact_driver'],
      ['cancel_booking', 'cancel_booking'],
      ['payment_query', 'payment_query'],
      ['safety_concern', 'safety_concern'],
      ['call_driver', 'call_driver'],
      ['message_driver', 'message_driver'],
      ['talk_to_agent', 'talk_to_agent'],
    ]);
  }

  private trainClassifier() {
    const classifier = new BayesClassifier();

    // Training data for each intent — more phrases = better classification
    const trainingData: Record<string, string[]> = {
      where_is_driver: [
        'where is my driver',
        'where is driver',
        'how far is my driver',
        'when will driver arrive',
        'driver location',
        'how long until driver arrives',
        'show driver location',
        'driver eta',
        'how many minutes until driver',
        'track my driver',
        'locate driver',
        'show me where my driver is',
        'where is the car',
        'check driver location',
        'when will you arrive',
        'how far away is the driver',
        'driver position',
        'is the driver close',
      ],
      driver_late: [
        'driver is late',
        'why is driver late',
        'driver taking too long',
        'driver delayed',
        'long wait time',
        'driver not coming',
        'been waiting too long',
        'driver eta wrong',
        'waiting forever',
        'already waited 20 minutes',
        'driver still not here',
        'this is taking too long',
        'the driver has not shown up',
        'driver is very late',
        'how much longer do I wait',
      ],
      contact_driver: [
        'contact driver',
        'talk to driver',
        'reach driver',
        'communicate with driver',
        'get in touch with driver',
        'connect me with driver',
        'how to contact driver',
        'i need to talk to my driver',
        'reach my driver',
        'how can i reach the driver',
      ],
      cannot_contact_driver: [
        'cannot reach driver',
        'unable to contact driver',
        'driver not answering',
        'call failed',
        'cannot call driver',
        'driver not responding',
        'no response from driver',
        'unreachable driver',
        'driver unavailable',
        'driver wont answer',
        'driver ignoring calls',
        'driver phone off',
        'cant get through to driver',
        'driver is not picking up',
      ],
      cancel_booking: [
        'cancel booking',
        'cancel ride',
        'cancel my ride',
        'i want to cancel',
        'cancel this ride',
        'dont want ride',
        'stop the ride',
        'cancel the booking',
        'cancel order',
        'i dont want to ride anymore',
        'cancel everything',
        'abort ride',
        'i changed my mind cancel',
        'i no longer need the ride',
      ],
      payment_query: [
        'how much does it cost',
        'how much will the ride cost',
        'how much is the fare',
        'what is the fare',
        'show me the fare',
        'fare estimate',
        'fare details',
        'fare breakdown',
        'price of ride',
        'ride cost',
        'total cost',
        'payment amount',
        'why is fare so high',
        'payment issue',
        'refund',
        'billing question',
        'fare question',
        'payment problem',
        'charge question',
        'why was i charged',
        'recalculate fare',
        'what is the price',
        'how much do i owe',
        'how much will it cost',
        'estimated cost',
        'estimated fare',
        'cost estimate',
        'show payment details',
        'what will i pay',
        'payment info',
        'how am i paying',
      ],
      safety_concern: [
        'i feel unsafe',
        'safety issue',
        'driver behavior',
        'uncomfortable',
        'danger',
        'threat',
        'harassment',
        'emergency',
        'help me',
        'i am in danger',
        'driver is scaring me',
        'driver is behaving weirdly',
        'please help emergency',
        'not safe',
        'feel threatened',
      ],
      call_driver: [
        'call my driver',
        'call driver now',
        'ring driver',
        'phone call driver',
        'dial driver',
        'call the driver',
        'please call driver',
        'i want to call driver',
        'make a call to driver',
        'phone driver',
      ],
      message_driver: [
        'message driver',
        'text driver',
        'send message',
        'message my driver',
        'text my driver',
        'send text to driver',
        'send a message to my driver',
        'write to driver',
        'chat with driver',
      ],
      talk_to_agent: [
        'talk to agent',
        'support',
        'customer service',
        'speak to human',
        'agent',
        'representative',
        'help from agent',
        'connect me to support',
        'i need a human',
        'escalate',
        'talk to a person',
        'live agent',
        'human support',
        'real person please',
      ],
    };

    // Train the classifier
    Object.entries(trainingData).forEach(([intent, phrases]) => {
      phrases.forEach((phrase) => {
        classifier.addDocument(phrase, intent);
      });
    });

    classifier.train();
    return classifier;
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private calculateConfidence(classifier: any, text: string): number {
    // Get probabilities for all classifications
    const results = classifier.getClassifications(text);
    if (results.length === 0) return 0;
    if (results.length === 1) return 0.95;

    // The Bayes classifier returns log-probability values that are very small.
    // To get a meaningful confidence, we compare the top result vs the second-best.
    // A large gap between #1 and #2 means high confidence.
    const topScore = results[0].value;
    const secondScore = results[1].value;

    // If both are 0 or equal, low confidence
    if (topScore === 0 && secondScore === 0) return 0.5;
    if (topScore === secondScore) return 0.5;

    // Calculate relative confidence: how much better is #1 vs #2
    // Use ratio-based approach for log probabilities
    const ratio = topScore / (secondScore || 0.0001);

    // Map the ratio to a 0.5-1.0 confidence range
    // ratio of 1 = 0.5 confidence, ratio > 2 = ~0.85+, ratio > 5 = ~0.95+
    const confidence = Math.min(0.5 + (ratio - 1) * 0.15, 1.0);

    return Math.max(0.5, Math.min(confidence, 1.0));
  }

  async detectIntent(userInput: string): Promise<IntentResult> {
    try {
      if (!config.enableNlp || !userInput.trim()) {
        return {
          intent: 'unknown',
          confidence: 0,
        };
      }

      const processedText = this.preprocessText(userInput);
      const intent = this.classifier.classify(processedText);
      const confidence = this.calculateConfidence(this.classifier, processedText);

      const actionType = this.intents.get(intent) as QuickAction | undefined;

      logger.info('Intent detected', { userInput, intent, confidence });

      return {
        intent,
        confidence,
        actionType,
        entities: this.extractEntities(processedText),
      };
    } catch (error) {
      logger.error('NLP error', { error });
      return {
        intent: 'unknown',
        confidence: 0,
      };
    }
  }

  private extractEntities(text: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract time references
    const timePatterns = {
      minutes: /(\d+)\s*minutes?/i,
      hours: /(\d+)\s*hours?/i,
      urgent: /urgent|asap|immediately|now/i,
    };

    Object.entries(timePatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        entities[key] = match[1] || true;
      }
    });

    return entities;
  }

  async getSuggestedResponses(intent: string): Promise<string[]> {
    const responses: Record<string, string[]> = {
      where_is_driver: [
        'Your driver is on the way. Let me get the live location...',
        'Checking driver details...',
      ],
      driver_late: [
        'I understand the wait. Let me check what\'s happening with your driver...',
        'Your driver may have been delayed. Let me get the updated ETA...',
      ],
      contact_driver: [
        'I can help you reach your driver. Would you like to call or message?',
        'Connecting you with your driver...',
      ],
      cannot_contact_driver: [
        'I\'m sorry you\'re unable to reach your driver. Let me escalate this...',
        'This is concerning. Let me help you with support...',
      ],
      cancel_booking: [
        'I can help you cancel. Let me check the cancellation policy...',
        'Processing your cancellation request...',
      ],
      payment_query: [
        'Let me help you with your payment question...',
        'I\'ll get the payment details for you...',
      ],
      safety_concern: [
        'Your safety is important. I\'m connecting you with support immediately...',
        'Emergency support is being dispatched. Stay in a public place if possible.',
      ],
      unknown: [
        'I\'m not sure I understood. Could you rephrase that?',
        'Can you tell me more about what you need help with?',
      ],
    };

    return responses[intent] || responses.unknown;
  }
}

export default new NLPService();
