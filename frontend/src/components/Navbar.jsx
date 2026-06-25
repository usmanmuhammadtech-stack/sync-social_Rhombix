import { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import { FiHome, FiUser, FiLogOut, FiSearch, FiX, FiBell, FiSun, FiMoon } from 'react-icons/fi';

const timeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const seconds = Math.floor((now - past) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const Navbar = () => {
  const { user, token, logout } = useContext(AuthContext);
  const { darkMode, toggleDark } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const debounceRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  const config = { headers: { Authorization: `Bearer ${token}` } };

  const handleSearch = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults(null); setShowSearch(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await axios.get(`http://localhost:5000/api/posts/search?q=${value}`, config);
        setResults(res.data);
        setShowSearch(true);
      } catch (err) { console.error('Search error:', err); }
      finally { setSearchLoading(false); }
    }, 400);
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setShowSearch(false);
    setShowMobileSearch(false);
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications/unread-count', config);
      setUnreadCount(res.data.count);
    } catch (err) { console.error(err); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications', config);
      setNotifications(res.data);
    } catch (err) { console.error(err); }
  };

  const handleBellClick = async () => {
    if (!showNotif) {
      await fetchNotifications();
      if (unreadCount > 0) {
        await axios.put('http://localhost:5000/api/notifications/mark-read', {}, config);
        setUnreadCount(0);
      }
    }
    setShowNotif(prev => !prev);
    setShowSearch(false);
    setShowMobileSearch(false);
  };

  const handleNotifClick = (n) => {
    setShowNotif(false);
    if (n.post?._id) navigate(`/post/${n.post._id}`);
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target)) setShowMobileSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const getNotifMessage = (n) => {
    const sender = `@${n.sender?.username || 'Someone'}`;
    if (n.type === 'like') return `${sender} ne teri post like ki ❤️`;
    if (n.type === 'comment') return `${sender} ne teri post pe comment kiya 💬`;
    if (n.type === 'follow') return `${sender} ne tujhe follow kiya 🎉`;
    return 'New notification';
  };

  const SearchDropdown = ({ containerClass }) => (
    <div className={`absolute top-11 left-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden ${containerClass}`}>
      {searchLoading ? (
        <div className="px-4 py-6 text-center text-xs text-gray-400">Searching...</div>
      ) : (
        <>
          {results?.users?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase px-4 pt-3 pb-1 tracking-wider">Users</p>
              {results.users.map(u => (
                <div key={u._id} onClick={clearSearch}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {u.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">@{u.username}</p>
                    <p className="text-[10px] text-gray-400">{u.followers?.length || 0} followers</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results?.posts?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase px-4 pt-3 pb-1 tracking-wider">Posts</p>
              {results.posts.map(p => (
                <div key={p._id} onClick={clearSearch}
                  className="px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">@{p.user?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.content}</p>
                </div>
              ))}
            </div>
          )}
          {results?.users?.length === 0 && results?.posts?.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-400">Koi result nahi mila 😕</div>
          )}
        </>
      )}
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-xs">
      <div className="max-w-5xl mx-auto px-3 h-16 flex items-center justify-between gap-2">

        {/* Logo */}
        <Link to="/" className="text-xl font-extrabold text-[#1F2937] dark:text-white tracking-tight hover:opacity-90 transition-opacity shrink-0">
          Sync<span className="text-[#4F46E5]">Social</span>
        </Link>

        {/* Desktop Search */}
        <div ref={searchRef} className="relative hidden sm:flex items-center w-72">
          <div className="flex items-center bg-[#F3F4F6] dark:bg-gray-800 rounded-xl px-3 py-1.5 w-full border border-transparent focus-within:border-indigo-200 focus-within:bg-white dark:focus-within:bg-gray-700 transition-all shadow-sm">
            <FiSearch className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results && setShowSearch(true)}
              placeholder="Search users or posts..."
              className="bg-transparent text-sm w-full focus:outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
            />
            {query && (
              <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 ml-1 cursor-pointer">
                <FiX size={14} />
              </button>
            )}
          </div>
          {showSearch && <SearchDropdown containerClass="" />}
        </div>

        {/* Icons */}
        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-300 shrink-0">

          {/* Mobile Search Icon */}
          <div ref={mobileSearchRef} className="relative sm:hidden">
            <button
              onClick={() => { setShowMobileSearch(prev => !prev); setShowNotif(false); }}
              className="hover:text-[#4F46E5] transition-colors text-xl cursor-pointer">
              <FiSearch />
            </button>
            {showMobileSearch && (
              <div className="absolute right-0 top-10 w-72 z-50">
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-indigo-200 dark:border-gray-600 shadow-lg">
                  <FiSearch className="text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search users or posts..."
                    className="bg-transparent text-sm w-full focus:outline-none text-gray-700 dark:text-gray-200"
                    autoFocus
                  />
                  {query && (
                    <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 ml-1 cursor-pointer">
                      <FiX size={14} />
                    </button>
                  )}
                </div>
                {showSearch && <SearchDropdown containerClass="mt-1" />}
              </div>
            )}
          </div>

          <Link to="/" className="hover:text-[#4F46E5] transition-colors text-xl" title="Home Feed">
            <FiHome />
          </Link>

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button onClick={handleBellClick}
              className="relative hover:text-[#4F46E5] transition-colors text-xl cursor-pointer">
              <FiBell />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-10 w-72 sm:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">Notifications</h3>
                  <button onClick={() => setShowNotif(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <FiX size={14} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-gray-400">
                      <FiBell className="mx-auto mb-2 text-2xl text-gray-200" />
                      Abhi koi notification nahi
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all cursor-pointer ${!n.read ? 'bg-indigo-50/60 dark:bg-gray-700/60' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {n.sender?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">{getNotifMessage(n)}</p>
                            {n.post?.content && (
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate">"{n.post.content}"</p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1"></span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDark}
            className="hover:text-[#4F46E5] transition-colors text-xl cursor-pointer"
            title="Toggle Dark Mode">
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>

          <Link to="/profile" className="flex items-center space-x-1.5 hover:text-[#4F46E5] transition-colors" title="My Profile">
            <FiUser className="text-xl" />
            <span className="text-xs font-semibold hidden md:inline-block bg-[#EEF2F6] dark:bg-gray-700 dark:text-gray-200 text-gray-700 px-2 py-0.5 rounded-md">
              @{user?.username}
            </span>
          </Link>

          <button onClick={handleLogout} className="hover:text-red-500 transition-colors text-xl cursor-pointer" title="Logout">
            <FiLogOut />
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;