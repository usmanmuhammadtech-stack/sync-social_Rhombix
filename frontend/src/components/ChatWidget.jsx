import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { FiMessageCircle, FiX, FiSend, FiChevronLeft } from 'react-icons/fi';

const timeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const seconds = Math.floor((now - past) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const ChatWidget = () => {
  const { user, token } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('users'); // 'users' | 'chat'
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const config = { headers: { Authorization: `Bearer ${token}` } };
  const myId = (user?.id || user?._id || '').toString();

  // Fetch users list
  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/users', config);
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/unread-count', config);
      setUnreadCount(res.data.count);
    } catch (err) { console.error(err); }
  };

  // Fetch conversation
  const fetchConversation = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/messages/conversation/${userId}`, config);
      setMessages(res.data);
      // Mark as read
      await axios.put(`http://localhost:5000/api/messages/mark-read/${userId}`, {}, config);
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeUser) return;
    try {
      const res = await axios.post('http://localhost:5000/api/messages/send', {
        receiverId: activeUser._id,
        text: text.trim()
      }, config);
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch (err) { console.error(err); }
  };

  // Open chat with user
  const openChat = async (u) => {
    setActiveUser(u);
    setView('chat');
    await fetchConversation(u._id);
  };

  // Poll messages when chat is open
  useEffect(() => {
    if (view === 'chat' && activeUser) {
      pollRef.current = setInterval(() => fetchConversation(activeUser._id), 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [view, activeUser]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll unread count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch users when opened
  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
          style={{ height: '420px' }}>

          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {view === 'chat' && (
                <button onClick={() => { setView('users'); setActiveUser(null); setMessages([]); }}
                  className="text-white/80 hover:text-white cursor-pointer mr-1">
                  <FiChevronLeft size={18} />
                </button>
              )}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <FiMessageCircle size={14} className="text-white" />
              </div>
              <span className="text-white font-bold text-sm">
                {view === 'chat' ? `@${activeUser?.username}` : 'Messages'}
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
              <FiX size={16} />
            </button>
          </div>

          {/* Users List */}
          {view === 'users' && (
            <div className="flex-1 overflow-y-auto">
              {users.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                  Koi user nahi mila
                </div>
              ) : (
                users.map(u => (
                  <div key={u._id} onClick={() => openChat(u)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 dark:hover:bg-gray-800 cursor-pointer transition-all border-b border-gray-50 dark:border-gray-800">
                    {u.profile?.avatarUrl && !u.profile.avatarUrl.includes('placeholder') ? (
                      <img src={u.profile.avatarUrl} alt="avatar"
                        className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {u.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">@{u.username}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0 ml-auto"></div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chat View */}
          {view === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                    Koi message nahi — pehla message bhejo! 👋
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMine = (msg.sender?._id || msg.sender)?.toString() === myId;
                    return (
                      <div key={index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          isMine
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-bl-sm'
                        }`}>
                          <p>{msg.text}</p>
                          <p className={`text-[9px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                            {timeAgo(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend}
                className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-300 dark:text-gray-200 dark:placeholder-gray-500 transition-all"
                />
                <button type="submit"
                  className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white cursor-pointer shrink-0 hover:opacity-90 transition-all">
                  <FiSend size={13} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer relative">
        {isOpen ? <FiX size={22} /> : <FiMessageCircle size={22} />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

    </div>
  );
};

export default ChatWidget;