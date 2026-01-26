import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MessageSquare, User, Shield, MessagesSquare, X, History, Plus, Paperclip, Clock, Bot, UserIcon as UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';

const LiveChatPage = () => {
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // FEATURE 7: File Upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // FEATURE 4: Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  
  // FEATURE 6: Chat History
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  // FEATURE 5: Auto-close warning
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [timeUntilClose, setTimeUntilClose] = useState(15 * 60);
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const inactivityTimerRef = useRef(null);

  // FEATURE 1: Real-time Polling
  useEffect(() => {
    fetchConversation();

    pollInterval.current = setInterval(() => {
      if (conversation) {
        pollForNewMessages();
      }
    }, 3000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // FEATURE 5: Auto-close timer
  useEffect(() => {
    if (conversation) {
      resetInactivityTimer();
    }
    
    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // FEATURE 5: Reset inactivity timer
  const resetInactivityTimer = () => {
    setTimeUntilClose(15 * 60);
    setInactivityWarning(false);
    
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setInterval(() => {
      setTimeUntilClose((prev) => {
        const newTime = prev - 1;
        
        if (newTime === 2 * 60) {
          setInactivityWarning(true);
        }
        
        if (newTime <= 0) {
          handleAutoClose();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
  };

  const handleAutoClose = () => {
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
    }
    setInactivityWarning(false);
    setShowFeedbackModal(true);
  };

  const formatTimeUntilClose = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchConversation = async () => {
    try {
      const response = await api.get('/chat/conversation');
      if (response.data.status === 'success') {
        setConversation(response.data.conversation);
        setMessages(response.data.conversation.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // FEATURE 1: Poll for new messages
  const pollForNewMessages = async () => {
    if (!conversation) return;
    
    try {
      const lastMessage = messages[messages.length - 1];
      const afterTimestamp = lastMessage ? lastMessage.createdAt : null;
      
      const response = await api.get(`/chat/conversation/${conversation.id}/messages`, {
        params: { after: afterTimestamp },
      });
      
      if (response.data.status === 'success' && response.data.messages.length > 0) {
        setMessages((prev) => [...prev, ...response.data.messages]);
        resetInactivityTimer();
      }
    } catch (error) {
      console.error('Failed to poll messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setSending(true);
    resetInactivityTimer();
    
    try {
      const response = await api.post('/chat/message', {
        message: newMessage.trim(),
      });

      if (response.data.status === 'success') {
        setMessages((prev) => [...prev, response.data.message]);
        
        // Add AI response if available
        if (response.data.aiResponse) {
          setMessages((prev) => [...prev, response.data.aiResponse]);
        }
        
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // FEATURE 7: File Upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !conversation) return;
    
    setIsUploading(true);
    resetInactivityTimer();
    
    try {
      const formData = new FormData();
      formData.append('files', selectedFile);
      
      const response = await api.post('/chat/message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.status === 'success') {
        await fetchConversation();
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  // FEATURE 3: Close Chat
  const handleCloseChat = async () => {
    if (!conversation) return;
    
    const confirm = window.confirm('Are you sure you want to close this chat?');
    if (!confirm) return;
    
    setShowFeedbackModal(true);
  };

  // FEATURE 4: Submit Feedback
  const handleSubmitFeedback = async () => {
    if (!conversation || feedbackRating === 0) {
      alert('Please select a rating');
      return;
    }
    
    try {
      await api.post(`/chat/conversation/${conversation.id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment,
      });
      
      setShowFeedbackModal(false);
      setFeedbackRating(0);
      setFeedbackComment('');
      
      handleStartNewChat();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback');
    }
  };

  // FEATURE 8: New Chat
  const handleStartNewChat = async () => {
    try {
      const response = await api.post('/chat/start-new');
      
      if (response.data.status === 'success') {
        setConversation(response.data.conversation);
        setMessages([]);
        resetInactivityTimer();
      }
    } catch (error) {
      console.error('Failed to start new chat:', error);
      alert('Failed to start new chat');
    }
  };

  // FEATURE 6: Load Chat History
  const loadChatHistory = async () => {
    try {
      const response = await api.get('/chat/history');
      
      if (response.data.status === 'success') {
        setChatHistory(response.data.conversations);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleViewHistory = () => {
    setShowChatHistory(true);
    loadChatHistory();
  };

  const handleLoadHistoryConversation = async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversation/${conversationId}/messages`);
      
      if (response.data.status === 'success') {
        const conv = chatHistory.find((c) => c.id === conversationId);
        setConversation(conv);
        setMessages(response.data.messages);
        setShowChatHistory(false);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                <MessagesSquare size={32} />
                Live Chat Support
              </h1>
              
              {/* FEATURE 2: Show AI vs Human */}
              <div className="flex items-center gap-2 mt-1">
                {conversation?.isAiHandling ? (
                  <>
                    <Bot className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">AI Assistant</span>
                  </>
                ) : (
                  <>
                    <UserCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Human Agent</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Buttons */}
          <div className="flex items-center gap-3">
            {/* FEATURE 6: History Button */}
            <button
              onClick={handleViewHistory}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="text-sm font-medium">History</span>
            </button>
            
            {/* FEATURE 8: New Chat Button */}
            <button
              onClick={handleStartNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Chat</span>
            </button>
            
            {/* FEATURE 3: Close Button */}
            <button
              onClick={handleCloseChat}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">Close</span>
            </button>
          </div>
        </div>

        {/* FEATURE 5: Inactivity Warning */}
        {inactivityWarning && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-800">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">
                Chat will close in {formatTimeUntilClose(timeUntilClose)} due to inactivity
              </span>
            </div>
            <button
              onClick={resetInactivityTimer}
              className="text-sm text-yellow-800 underline hover:text-yellow-900"
            >
              Stay Active
            </button>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-6 rounded-xl text-center">
            <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="text-white" size={24} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Fast Response</h3>
            <p className="text-sm text-gray-600">Get answers within minutes</p>
          </div>

          <div className="bg-green-50 p-6 rounded-xl text-center">
            <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="text-white" size={24} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Real-Time</h3>
            <p className="text-sm text-gray-600">Chat with live support agents</p>
          </div>

          <div className="bg-purple-50 p-6 rounded-xl text-center">
            <div className="bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="text-white" size={24} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Expert Help</h3>
            <p className="text-sm text-gray-600">Specialized support team</p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ height: '500px' }}>
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 bg-gradient-to-r from-primary to-secondary text-white">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare size={20} />
                Support Chat
              </h3>
              <p className="text-sm opacity-90">
                {conversation?.status === 'ACTIVE' ? 'Active conversation' : 'Start a new conversation'}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No messages yet</h3>
                  <p className="text-gray-500">Send a message to start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          msg.senderType === 'USER'
                            ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-none'
                            : msg.isAiGenerated
                            ? 'bg-blue-100 text-blue-900 rounded-bl-none'
                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        {/* Sender Label */}
                        <div className="text-xs opacity-75 mb-1">
                          {msg.senderType === 'USER' && 'You'}
                          {msg.senderType === 'ADMIN' && msg.isAiGenerated && '🤖 AI Assistant'}
                          {msg.senderType === 'ADMIN' && !msg.isAiGenerated && '👤 Support Agent'}
                        </div>
                        
                        <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.senderType === 'USER' ? 'text-white opacity-75' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* FEATURE 7: File Preview */}
            {selectedFile && (
              <div className="px-6 py-3 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-800">
                  <Paperclip className="w-4 h-4" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <span className="text-xs opacity-75">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-3 py-1 text-blue-600 text-sm hover:text-blue-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                {/* FEATURE 7: File Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Send size={20} />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 4: Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">How was your experience?</h2>
            
            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedbackRating(star)}
                  className={`text-3xl ${
                    star <= feedbackRating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 transition-colors`}
                >
                  ★
                </button>
              ))}
            </div>
            
            {/* Comment */}
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Any additional comments? (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              rows="3"
            />
            
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  handleStartNewChat();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitFeedback}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE 6: Chat History Modal */}
      {showChatHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Chat History</h2>
              <button
                onClick={() => setShowChatHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {chatHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No chat history found</p>
              ) : (
                chatHistory.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleLoadHistoryConversation(chat.id)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(chat.lastMessageAt).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          chat.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {chat.status}
                      </span>
                    </div>
                    {chat.messages && chat.messages[0] && (
                      <p className="text-sm text-gray-600 truncate">
                        {chat.messages[0].message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {chat._count?.messages || 0} messages
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default LiveChatPage;