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
  
  // ✅ NEW: Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const messagesContainerRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  // ✅ NEW: Check if first-time user and show welcome modal
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome && user) {
      // Small delay to let the dashboard load first
      setTimeout(() => {
        setShowWelcomeModal(true);
      }, 1000);
    }
  }, [user]);

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
  };

  const closeWidget = () => {
    setIsOpen(false);
  };

  const minimizeWidget = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  // ✅ NEW: Handle welcome modal done button
  const handleWelcomeDone = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcomeModal(false);
    // Open chatbot after closing welcome modal
    openWidget();
  };

  // ✅ NEW: Welcome Modal
  if (showWelcomeModal) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-fadeIn" />
        
        {/* Welcome Modal */}
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-slideUp">
            {/* Decorative gradient header */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 rounded-t-3xl"></div>
            
            {/* Content */}
            <div className="text-center space-y-6 mt-4">
              {/* Icon with pulsing effect */}
              <div className="relative inline-flex items-center justify-center">
                {/* Pulsing rings */}
                <div className="absolute w-24 h-24 rounded-full bg-purple-200 animate-ping"></div>
                <div className="absolute w-20 h-20 rounded-full bg-purple-300 animate-ping" style={{ animationDelay: '0.2s' }}></div>
                
                {/* Icon */}
                <div className="relative bg-gradient-to-r from-purple-600 to-violet-600 p-6 rounded-full">
                  <Bot size={48} className="text-white" />
                </div>
              </div>
              
              {/* Welcome text */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome to Outbound Impact! 🎉
                </h2>
                <p className="text-lg text-gray-600">
                  {user?.name ? `Hi ${user.name.split(' ')[0]}!` : 'Hello!'} We're excited to have you here.
                </p>
              </div>
              
              {/* Features highlight */}
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 space-y-3 text-left">
                <h3 className="font-bold text-gray-900 text-center mb-4">Get Started Quickly:</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎨</span>
                    <div>
                      <p className="font-semibold text-gray-900">Create Streams</p>
                      <p className="text-sm text-gray-600">Organize your content with QR codes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📤</span>
                    <div>
                      <p className="font-semibold text-gray-900">Upload Content</p>
                      <p className="text-sm text-gray-600">Images, videos, audio, text & embeds</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <p className="font-semibold text-gray-900">Track Analytics</p>
                      <p className="text-sm text-gray-600">See how your content performs</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Assistant info */}
              <div className="bg-gradient-to-r from-purple-100 to-violet-100 rounded-2xl p-4 border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <Bot size={24} className="text-purple-600" />
                  <h4 className="font-bold text-gray-900">Need Help?</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Our <strong>FREE AI Assistant</strong> is available 24/7 to help you with anything! 
                  Just click the chat icon anytime.
                </p>
              </div>
              
              {/* Done button */}
              <button
                onClick={handleWelcomeDone}
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:opacity-90 transition-all transform hover:scale-105 shadow-lg"
              >
                Got It! Let's Go 🚀
              </button>
              
              <p className="text-xs text-gray-400">
                Click "Got It" to open your AI Assistant
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ✅ REMOVED: Dancing blinking prompt (lines 248-272 deleted)
  // User didn't like it, so it's completely removed

  // Minimized State (Collapsed to right side)
  if (isMinimized && !isOpen) {
    return (
      <button
        onClick={openWidget}
        className="fixed bottom-24 right-0 z-[9999] bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-4 rounded-l-2xl shadow-2xl hover:pr-6 transition-all duration-300 group flex items-center gap-2"
        title="Open AI Assistant"
      >
        {/* ✅ CHANGED: "Hide" text instead of arrow icon */}
        <span className="font-semibold text-sm group-hover:-translate-x-1 transition-transform">Hide</span>
        <Bot size={24} />
      </button>
    );
  }

  // ✅ UPDATED: Floating Chat Button with PULSE EFFECT (like eye and mic icons)
  if (!isOpen && !isMinimized) {
    return (
      <button
        onClick={openWidget}
        className="fixed bottom-24 right-6 z-[9999] group"
        title="Open AI Assistant"
      >
        {/* Pulsing rings - same as eye and mic icons */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-purple-400/30 animate-ping"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.2s' }}>
          <div className="w-16 h-16 rounded-full bg-purple-500/40 animate-ping"></div>
        </div>
        
        {/* Main button */}
        <div className="relative bg-gradient-to-r from-purple-600 to-violet-600 text-white p-5 rounded-full shadow-2xl group-hover:scale-110 transition-transform duration-200">
          <Bot size={32} className="group-hover:rotate-12 transition-transform" />
        </div>
      </button>
    );
  }

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
            className="hover:bg-white/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
            title="Minimize"
          >
            {/* ✅ CHANGED: "Hide" text instead of ChevronRight icon */}
            <span className="text-sm font-semibold">Hide</span>
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
