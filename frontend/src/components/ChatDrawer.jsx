import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Send, MessageSquare, Loader2 } from 'lucide-react';

export default function ChatDrawer({ isOpen, projectId, projectName, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (showLoading = false) => {
    if (!projectId) return;
    if (showLoading) setLoading(true);
    try {
      const res = await api.chat.getMessages(projectId);
      if (res.success) {
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.error('Failed to load project messages:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      loadMessages(true);
      const interval = setInterval(() => {
        loadMessages(false);
      }, 4000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
      setNewMessage('');
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await api.chat.sendMessage(projectId, messageText);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
      } else {
        await loadMessages(false);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm transition-opacity flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-heading">
                {projectName ? `${projectName} Chat` : 'Project Chat'}
              </h3>
              <p className="text-xs text-zinc-500">Live project discussion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
          {loading ? (
            <div className="h-full flex items-center justify-center text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-center px-4">
              <MessageSquare className="w-10 h-10 stroke-[1.5] mb-2 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-600">No messages yet</p>
              <p className="text-xs text-zinc-400 mt-1">Start the conversation with your team!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = user && msg.user_id === user.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="w-7 h-7 rounded-full bg-zinc-200 flex-shrink-0 flex items-center justify-center overflow-hidden text-xs font-semibold text-zinc-600">
                    {msg.user_avatar ? (
                      <img src={msg.user_avatar} alt={msg.user_name} className="w-full h-full object-cover" />
                    ) : (
                      (msg.user_name || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-zinc-700">
                        {isMe ? 'You' : msg.user_name}
                      </span>
                      {msg.created_at && (
                        <span className="text-[10px] text-zinc-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-zinc-900 text-white rounded-tr-none'
                          : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 text-xs bg-zinc-100 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all text-zinc-900"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

