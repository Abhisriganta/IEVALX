// ============================================================================
// useInstantChat.js
// Hook for the Instant Chat screen (conversations + messages + send)
// Location: src/hooks/jobseeker/useInstantChat.js
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import liveChatService from '@/services/api/jobseeker/liveChatService';

export const useInstantChat = () => {
  const [conversations,        setConversations]        = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages,             setMessages]             = useState([]);
  const [loadingConvos,        setLoadingConvos]        = useState(false);
  const [loadingMessages,      setLoadingMessages]      = useState(false);
  const [sending,              setSending]              = useState(false);
  const [error,                setError]                = useState(null);

  // -- Fetch conversation list ---------------------------------------------
  const fetchConversations = useCallback(async () => {
    setLoadingConvos(true);
    setError(null);
    try {
      const data = await liveChatService.getInstantChatConversations();
      setConversations(data);
      // Auto-select first conversation if none active
      if (data.length > 0) {
        setActiveConversationId((curr) => curr ?? data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  // -- Fetch messages for active conversation ------------------------------
  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await liveChatService.getInstantChatMessages(conversationId);
      setMessages(data);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // -- Send a message ------------------------------------------------------
  // Accepts (text, attachments?) where attachments is an array of File-shaped
  // objects (each already containing previewUrl/kind/name/size from the
  // composer's addAttachments helper). Text-only calls still work.
  const sendMessage = useCallback(async (text, attachments = []) => {
    const cleanText = (text || '').trim();
    if (!cleanText && attachments.length === 0) return;
    if (!activeConversationId) return;

    setSending(true);
    setError(null);

    // Optimistic message — carry the attachments straight into the bubble so
    // the user sees their images/files land before the network round-trip.
    const optimistic = {
      id: `tmp-${Date.now()}`,
      from: 'me',
      text: cleanText,
      attachments,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await liveChatService.sendInstantChatMessage(
        activeConversationId,
        { text: cleanText, attachments },
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? result : m))
      );

      // Bump the conversation's lastMessage in the sidebar list. If the
      // message was pure attachments, use a friendly descriptor.
      const previewText = cleanText
        || (attachments.length === 1
          ? (attachments[0].kind === 'image' ? '📷 Photo' : `📎 ${attachments[0].name}`)
          : `📎 ${attachments.length} attachments`);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessage: previewText, lastMessageAt: result.timestamp, unreadCount: 0 }
            : c
        )
      );
    } catch (err) {
      setError(err.message || 'Send failed');
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }, [activeConversationId]);

  // -- Select a conversation -----------------------------------------------
  const selectConversation = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  // -- Load conversations on mount -----------------------------------------
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // -- Load messages whenever active conversation changes ------------------
  useEffect(() => {
    fetchMessages(activeConversationId);
  }, [activeConversationId, fetchMessages]);

  return {
    conversations,
    activeConversationId,
    messages,
    loadingConvos,
    loadingMessages,
    sending,
    error,
    selectConversation,
    sendMessage,
    refetch: fetchConversations,
  };
};

export default useInstantChat;