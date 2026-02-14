import { SafetyEvent } from '../types';
import logger from '../utils/logger';

class SafetyDetectionService {
  private safetyKeywords: Map<string, 'low' | 'medium' | 'high' | 'critical'>;
  private events: Map<string, SafetyEvent[]>;

  constructor() {
    this.safetyKeywords = this.initializeSafetyKeywords();
    this.events = new Map();
  }

  private initializeSafetyKeywords(): Map<string, 'low' | 'medium' | 'high' | 'critical'> {
    const keywords: Array<[string, 'low' | 'medium' | 'high' | 'critical']> = [
      // Critical severity
      ['emergency', 'critical'],
      ['help', 'critical'],
      ['danger', 'critical'],
      ['threat', 'critical'],
      ['911', 'critical'],
      ['police', 'critical'],
      ['kidnap', 'critical'],
      ['assault', 'critical'],
      ['attack', 'critical'],

      // High severity
      ['unsafe', 'high'],
      ['uncomfortable', 'high'],
      ['scared', 'high'],
      ['harassment', 'high'],
      ['inappropriate', 'high'],
      ['threatening', 'high'],
      ['weapon', 'high'],
      ['injured', 'high'],

      // Medium severity
      ['concern', 'medium'],
      ['worried', 'medium'],
      ['anxious', 'medium'],
      ['suspicious', 'medium'],
      ['wrong route', 'medium'],
      ['detour', 'medium'],
      ['speeding', 'medium'],

      // Low severity
      ['question', 'low'],
      ['concerned', 'low'],
      ['wondering', 'low'],
      ['check', 'low'],
    ];
    return new Map(keywords);
  }

  detectSafetyConcerns(text: string, conversationId: string, userId: string, driverId?: string): SafetyEvent | null {
    const lowerText = text.toLowerCase();
    const detectedKeywords: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Search for safety keywords
    for (const [keyword, severity] of this.safetyKeywords) {
      if (lowerText.includes(keyword)) {
        detectedKeywords.push(keyword);

        // Update severity if this keyword is worse
        const severityValues = { low: 1, medium: 2, high: 3, critical: 4 };
        if (severityValues[severity] > severityValues[maxSeverity]) {
          maxSeverity = severity;
        }
      }
    }

    if (detectedKeywords.length === 0) {
      return null;
    }

    const event: SafetyEvent = {
      id: `safety_${conversationId}_${Date.now()}`,
      conversationId,
      userId,
      driverId,
      severity: maxSeverity,
      keywords: detectedKeywords,
      timestamp: new Date(),
      status: 'detected',
    };

    // Store event
    if (!this.events.has(userId)) {
      this.events.set(userId, []);
    }
    this.events.get(userId)!.push(event);

    logger.warn('Safety event detected', {
      eventId: event.id,
      severity: maxSeverity,
      keywords: detectedKeywords,
      userId,
      conversationId,
    });

    return event;
  }

  isEscalationRequired(event: SafetyEvent): boolean {
    // Only escalate for medium and above severity
    return event.severity !== 'low';
  }

  getSafetyResponse(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const responses = {
      low: 'I understand your concern. Let me help you with that.',
      medium: 'Your safety is important to us. I\'m escalating this to our support team.',
      high: 'This is concerning. I\'m immediately connecting you with emergency support.',
      critical: '🚨 EMERGENCY: I\'m connecting you with emergency services and our support team immediately. Stay in a public place if you can.',
    };

    return responses[severity];
  }

  getRecentEvents(userId: string, hours: number = 1): SafetyEvent[] {
    const events = this.events.get(userId) || [];
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    return events.filter((event) => event.timestamp > cutoffTime);
  }

  markEventAsEscalated(eventId: string, userId: string, escalatedTo: string): boolean {
    const events = this.events.get(userId);
    if (!events) return false;

    const event = events.find((e) => e.id === eventId);
    if (event) {
      event.status = 'escalated';
      event.escalatedTo = escalatedTo;
      logger.info('Safety event escalated', { eventId, escalatedTo });
      return true;
    }

    return false;
  }

  analyzePatterns(userId: string): { riskLevel: 'low' | 'medium' | 'high'; pattern: string } {
    const events = this.getRecentEvents(userId, 24); // Last 24 hours

    if (events.length === 0) {
      return { riskLevel: 'low', pattern: 'No recent safety concerns' };
    }

    const criticalCount = events.filter((e) => e.severity === 'critical').length;
    const highCount = events.filter((e) => e.severity === 'high').length;
    const mediumCount = events.filter((e) => e.severity === 'medium').length;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let pattern = 'Isolated safety concern';

    if (criticalCount > 0) {
      riskLevel = 'high';
      pattern = 'Critical safety events detected';
    } else if (highCount > 1 || (highCount > 0 && mediumCount > 0)) {
      riskLevel = 'high';
      pattern = 'Multiple high-severity safety concerns';
    } else if (mediumCount > 2) {
      riskLevel = 'medium';
      pattern = 'Recurring medium-severity concerns';
    }

    return { riskLevel, pattern };
  }
}

export default new SafetyDetectionService();
