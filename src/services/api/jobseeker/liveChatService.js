

import {
  instantChatConversationsMock,
  instantChatMessagesMock,
} from '@/mocks/jobseeker/liveChat.mock';

const MOCK_DELAY_MS = 350;
const mockReturn = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(data), MOCK_DELAY_MS));

const liveChatService = {
  getInstantChatConversations: async () => {
    try {
      return await mockReturn(instantChatConversationsMock);
    } catch (error) {
      console.error('Error fetching instant-chat conversations:', error);
      throw error;
    }
  },

  getInstantChatMessages: async (conversationId) => {
    try {
      const list = instantChatMessagesMock[conversationId] || [];
      return await mockReturn(list);
    } catch (error) {
      console.error('Error fetching instant-chat messages:', error);
      throw error;
    }
  },

  sendInstantChatMessage: async (conversationId, payload) => {
    try {
      
      const body = typeof payload === 'string'
        ? { text: payload, attachments: [] }
        : { text: payload?.text || '', attachments: payload?.attachments || [] };

      const attachments = body.attachments.map((f) => {
      
        if (f && typeof f === 'object' && 'previewUrl' in f) return f;
        const isImage = (f.type || '').startsWith('image/');
        return {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: f.name || 'file',
          size: f.size || 0,
          type: f.type || 'application/octet-stream',
          kind: isImage ? 'image' : 'file',
          previewUrl: isImage ? URL.createObjectURL(f) : null,
          path: f.webkitRelativePath || null,
        };
      });

      return await mockReturn({
        id: 'mc-' + Date.now(),
        from: 'me',
        text: body.text,
        attachments,
        timestamp: new Date().toISOString(),
        conversationId,
      });
    } catch (error) {
      console.error('Error sending instant-chat message:', error);
      throw error;
    }
  },
};

export default liveChatService;