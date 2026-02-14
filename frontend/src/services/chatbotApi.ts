import axios from 'axios';

class ChatbotApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async initiateChatbot(bookingId: string, userId: string, driverId?: string) {
    const response = await axios.post(`${this.baseUrl}/api/chatbot/initiate`, {
      bookingId,
      userId,
      driverId,
    });
    return response.data;
  }

  async sendMessage(
    conversationId: string,
    bookingId: string,
    userId: string,
    message: string
  ) {
    const response = await axios.post(`${this.baseUrl}/api/chatbot/message`, {
      conversationId,
      bookingId,
      userId,
      message,
    });
    return response.data;
  }

  async sendQuickAction(
    conversationId: string,
    bookingId: string,
    userId: string,
    action: string
  ) {
    const response = await axios.post(`${this.baseUrl}/api/chatbot/quick-action`, {
      conversationId,
      bookingId,
      userId,
      action,
    });
    return response.data;
  }

  async getConversation(conversationId: string) {
    const response = await axios.get(`${this.baseUrl}/api/chatbot/conversation/${conversationId}`);
    return response.data;
  }

  async escalateConversation(
    conversationId: string,
    bookingId: string,
    userId: string,
    escalationType: string,
    reason?: string
  ) {
    const response = await axios.post(`${this.baseUrl}/api/chatbot/escalate`, {
      conversationId,
      bookingId,
      userId,
      escalationType,
      reason,
    });
    return response.data;
  }

  async closeConversation(conversationId: string, reason?: string) {
    const response = await axios.post(`${this.baseUrl}/api/chatbot/close`, {
      conversationId,
      reason,
    });
    return response.data;
  }
}

export default ChatbotApiService;
