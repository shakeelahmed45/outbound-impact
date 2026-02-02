import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, ChevronRight, ChevronLeft, Bot, Loader2, ThumbsUp, ThumbsDown, Minimize2 } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const GlobalAiChatWidget = ({ showBlinkingPrompt = false }) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPrompt, setShowPrompt] = useState(showBlinkingPrompt);
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const messagesContainerRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  // Initialize conversation when widget opens
  useEffect(() => {
    if (isOpen && !conversationId) {
      initializeConversation();
    }
  }, [isOpen]);

  // Poll for new messages
  useEffect(() => {
    if (isOpen && conversationId) {
      pollInterval.current = setInterval(() => {
        pollForNewMessages();
      }, 3000);
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [isOpen, conversationId]);

  // Smart auto-scroll - only scroll when new message added and user is near bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is near bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // Only auto-scroll if:
    // 1. New message was added (count increased)
    // 2. User is near bottom OR shouldAutoScroll flag is true (for sent messages)
    const messageCountIncreased = messages.length > previousMessageCountRef.current;
    
    if (messageCountIncreased && (isNearBottom || shouldAutoScrollRef.current)) {
      scrollToBottom();
      shouldAutoScrollRef.current = false;
    }
    
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  // Hide blinking prompt after 30 seconds
  useEffect(() => {
    if (showPrompt) {
      const timer = setTimeout(() => {
        setShowPrompt(false);
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [showPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    try {
      const response = await api.post('/chat/conversations');
      if (response.data.status === 'success') {
        setConversationId(response.data.conversation.id);
        console.log('✅ Conversation created:', response.data.conversation.id);
        
        // Add welcome message
        setMessages([{
          id: 'welcome',
          message: `Hello${user?.name ? ' ' + user.name.split(' ')[0] : ''}! 👋 

I'm your AI assistant for Outbound Impact. I can help you with:

📤 **Uploading Content** - Images, videos, documents, text, embedded links
🎨 **Creating Streams** - Organizing and sharing content collections
📱 **QR Codes & NFC** - Generating and managing tap-to-view experiences
👥 **Team Management** - Adding members and managing permissions
📊 **Analytics** - Understanding your content performance
💳 **Billing & Plans** - Subscriptions and account management

What can I help you with today?`,
          senderType: 'ADMIN',
          isAiGenerated: true,
          isUser: false,
          isAi: true,
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const pollForNewMessages = async () => {
    if (!conversationId) return;

    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      if (response.data.status === 'success') {
        console.log('📥 Polled messages from API:', response.data.messages);
        
        // ✅ FIXED: Merge messages instead of replacing
        const newMessages = response.data.messages;
        setMessages(prev => {
          // Keep welcome message if it exists
          const welcomeMsg = prev.find(m => m.id === 'welcome');
          const welcomeArray = welcomeMsg ? [welcomeMsg] : [];
          
          // Merge with API messages, avoiding duplicates
          const messageMap = new Map();
          [...welcomeArray, ...newMessages].forEach(msg => {
            messageMap.set(msg.id, msg);
          });
          
          const merged = Array.from(messageMap.values()).sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
          
          console.log('💬 Merged messages:', merged.length, 'total');
          return merged;
        });
      }
    } catch (error) {
      console.error('Failed to poll messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !conversationId || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Enable auto-scroll for this message
    shouldAutoScrollRef.current = true;

    // Add user message optimistically
    const userMsg = {
      id: `temp-${Date.now()}`,
      message: messageContent,  // ✅ FIXED: Use 'message' not 'content'
      senderType: 'USER',
      isAiGenerated: false,
      isUser: true,
      isAi: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
        content: messageContent,
      });

      console.log('📤 Send message response:', response.data);

      if (response.data.status === 'success') {
        console.log('✅ User message from API:', response.data.message);
        
        // Replace temp message with real one from API
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== userMsg.id);
          return [...filtered, response.data.message];
        });

        // Add AI response if available
        if (response.data.aiResponse) {
          console.log('🤖 AI response from API:', response.data.aiResponse);
          
          const aiMsg = {
            id: response.data.aiResponse.id || `ai-${Date.now()}`,
            message: response.data.aiResponse.response,  // ✅ FIXED: Use 'message' not 'content'
            senderType: 'ADMIN',
            isAiGenerated: true,
            isUser: false,
            isAi: true,
            createdAt: new Date().toISOString(),
          };
          
          console.log('🤖 Adding AI message to display:', aiMsg);
          setMessages(prev => [...prev, aiMsg]);
        } else {
          console.log('⚠️ No AI response in API reply');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleFeedback = async (messageId, isHelpful) => {
    try {
      await api.post(`/chat/messages/${messageId}/feedback`, {
        wasHelpful: isHelpful,
      });
      
      // Update local state to show feedback was recorded
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, feedbackGiven: true } : msg
      ));
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const openWidget = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setShowPrompt(false);
  };

  const closeWidget = () => {
    setIsOpen(false);
  };

  const minimizeWidget = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  // Blinking Prompt (Dashboard only)
  if (showPrompt && !isOpen && !isMinimized) {
    return (
      <div className="fixed bottom-24 right-6 z-[9999] animate-bounce">
        <div 
          onClick={openWidget}
          className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-4 rounded-2xl shadow-2xl cursor-pointer hover:scale-105 transition-transform duration-200 flex items-center gap-3"
        >
          <Bot size={28} className="animate-pulse" />
          <div>
            <p className="font-bold text-lg">Do you need help?</p>
            <p className="text-sm opacity-90">Ask me anything about Outbound Impact!</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPrompt(false);
            }}
            className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Minimized State (Collapsed to right side)
  if (isMinimized && !isOpen) {
    return (
      <button
        onClick={openWidget}
        className="fixed bottom-24 right-0 z-[9999] bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 rounded-l-2xl shadow-2xl hover:pr-6 transition-all duration-300 group flex items-center gap-2"
        title="Open AI Assistant"
      >
        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
        <Bot size={24} />
      </button>
    );
  }

  // Floating Chat Button (Closed state)
  if (!isOpen && !isMinimized) {
    return (
      <button
        onClick={openWidget}
        className="fixed bottom-24 right-6 z-[9999] bg-gradient-to-r from-purple-600 to-violet-600 text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 group"
        title="Open AI Assistant"
      >
        <Bot size={32} className="group-hover:rotate-12 transition-transform" />
      </button>
    );
  };

  // Full Chat Widget (Open state)
  return (
    <div className="fixed bottom-24 right-6 z-[9999] w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">AI Assistant</h3>
            <p className="text-xs opacity-90">Powered by Groq AI (FREE)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={minimizeWidget}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            title="Minimize"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={closeWidget}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {messages.map((message) => {
          // ✅ FIXED: Support both 'message' and 'content' fields
          const messageText = message.message || message.content || '';
          const isUser = message.isUser || message.senderType === 'USER';
          const isAi = message.isAi || message.isAiGenerated;
          
          if (!messageText) {
            console.warn('⚠️ Empty message:', message);
          }
          
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {isAi && (
                    <div className="flex items-center gap-2 mb-2 text-sm opacity-75">
                      <Bot size={16} />
                      <span className="font-medium">AI Assistant</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {messageText}
                  </div>
                </div>

                {/* Feedback Buttons (AI messages only) */}
                {isAi && !message.feedbackGiven && message.id !== 'welcome' && (
                  <div className="flex items-center gap-2 mt-2 ml-2">
                    <span className="text-xs text-gray-500">Was this helpful?</span>
                    <button
                      onClick={() => handleFeedback(message.id, true)}
                      className="text-gray-400 hover:text-green-600 transition-colors"
                      title="Helpful"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, false)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Not Helpful"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}

                {message.feedbackGiven && (
                  <div className="text-xs text-gray-400 mt-1 ml-2">
                    ✓ Thank you for your feedback!
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-gray-400 mt-1 ml-2">
                  {new Date(message.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          );
        })}
        
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-purple-600" />
              <span className="text-sm text-gray-600">AI is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ask me anything..."
            disabled={sending}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Powered by Groq AI (100% FREE) • Ultra-fast responses
        </p>
      </form>
    </div>
  );
};

export default GlobalAiChatWidget;
