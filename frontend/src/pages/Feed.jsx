import { useContext, useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { FiImage, FiHeart, FiMessageCircle, FiUserPlus, FiUserCheck, FiSend, FiX, FiZap, FiMoreHorizontal, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Sometime ago';
  const now = new Date();
  const postDate = new Date(dateString);
  const secondsPast = Math.floor((now.getTime() - postDate.getTime()) / 1000);
  if (secondsPast < 60) return 'Just now';
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)}m ago`;
  if (secondsPast <= 86400) return `${Math.floor(secondsPast / 3600)}h ago`;
  return postDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const Feed = () => {
  const { user, token } = useContext(AuthContext);
  const { postId } = useParams();
  const highlightRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [myFollowing, setMyFollowing] = useState(user?.following || []);
  const [activeCommentBox, setActiveCommentBox] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const fileInputRef = useRef(null);
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const myUserId = (user?.id || user?._id || '').toString();
  const myUsername = (user?.username || '').toLowerCase();

  const fetchPosts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/posts', config);
      setPosts(res.data);
    } catch (err) { console.error("Error fetching posts:", err); }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/posts/suggestions/creators', config);
      setSuggestions(res.data);
    } catch (err) { console.error("Error fetching suggestions:", err); }
  };

  useEffect(() => {
    fetchPosts();
    fetchSuggestions();
    const interval = setInterval(() => { fetchSuggestions(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (postId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 600);
    }
  }, [postId, posts]);

  const handleImageChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!(file instanceof File)) return;
    setSelectedImage(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    try { setPreviewUrl(URL.createObjectURL(file)); }
    catch (err) { console.error("Error creating preview URL:", err); }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e) => {
    if (e) e.preventDefault();
    if (!content.trim() && !selectedImage) {
      toast.error("Pehle kuch likho ya photo add karo!");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Post upload ho rahi hai...");
    let finalImageUrl = '';
    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        const uploadRes = await axios.post('http://localhost:5000/api/posts/upload-image', formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data.imageUrl;
      }
      const res = await axios.post('http://localhost:5000/api/posts', { content, imageUrl: finalImageUrl }, config);
      setPosts((prevPosts) => [res.data, ...prevPosts]);
      setContent('');
      handleClearImage();
      toast.success("Post successfully sync ho gayi! 🎉", { id: toastId });
    } catch (err) {
      if (!err.response) toast.error("Server se connect nahi ho pa raha!", { id: toastId });
      else toast.error(err.response?.data?.message || "Post create karne mein error!", { id: toastId });
    } finally { setLoading(false); }
  };

  const handleLike = async (postId) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${postId}/like`, {}, config);
      setPosts((prevPosts) => prevPosts.map(post => post._id === postId ? { ...post, likes: res.data.likes } : post));
    } catch (err) { console.error("Error liking post:", err); }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/posts/${postId}/comment`, { text: commentText }, config);
      setPosts((prevPosts) => prevPosts.map(post => post._id === postId ? { ...post, comments: res.data } : post));
      setCommentText('');
      toast.success("Comment post ho gaya!", { duration: 2000 });
    } catch (err) { toast.error("Comment post nahi ho saka!"); }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Post delete karna chahte ho?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/posts/${postId}`, config);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success('Post delete ho gayi!');
    } catch (err) { toast.error('Delete nahi hua!'); }
  };

  const handleEditSave = async (postId) => {
    if (!editContent.trim()) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${postId}/edit`, { content: editContent }, config);
      setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
      setEditingPost(null);
      setEditContent('');
      toast.success('Post update ho gayi!');
    } catch (err) { toast.error('Edit nahi hua!'); }
  };

  const handleFollow = async (targetUserId) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/user/${targetUserId}/follow`, {}, config);
      setMyFollowing(res.data.following);
      const isNowFollowing = res.data.following.includes(targetUserId);
      toast.success(isNowFollowing ? "Follow kar liya! 👋" : "Unfollow ho gaya", { duration: 2000 });
    } catch (err) { toast.error("Kuch ghalat ho gaya!"); }
  };

  return (
    <div className="min-h-screen feed-bg dark:bg-gray-950">
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: '12px', fontSize: '13px', fontWeight: '500', padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
        success: { style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' } },
        error: { style: { background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' } },
        loading: { style: { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' } },
      }} />

      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {/* LEFT COLUMN */}
        <div className="hidden md:block lg:col-span-1">
          <div className="glass-card dark:bg-gray-900 dark:border-gray-800 p-6 sticky top-24">
            <div className="flex flex-col items-center text-center">
              <div className="avatar-ring mb-3">
                {user?.profile?.avatarUrl && !user.profile.avatarUrl.includes('placeholder') ? (
                  <img src={user.profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 avatar-gradient rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base tracking-tight">@{user?.username || 'user'}</h3>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-full px-2">{user?.email || ''}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block"></span>
                Active
              </span>
            </div>
            <div className="my-5 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
            <div className="grid grid-cols-2 gap-2">
              <div className="stat-pill dark:bg-gray-800 dark:border-gray-700">
                <p className="text-lg font-bold text-gray-800 dark:text-white">{user?.followers?.length || 0}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Followers</p>
              </div>
              <div className="stat-pill dark:bg-gray-800 dark:border-gray-700">
                <p className="text-lg font-bold text-gray-800 dark:text-white">{myFollowing.length}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Following</p>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="md:col-span-2 space-y-4">

          {/* Create Post */}
          <form onSubmit={handleCreatePost} className="glass-card dark:bg-gray-900 dark:border-gray-800 p-5">
            <div className="flex space-x-3">
              {user?.profile?.avatarUrl && !user.profile.avatarUrl.includes('placeholder') ? (
                <img src={user.profile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 shadow-md ring-2 ring-indigo-100" />
              ) : (
                <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="w-full space-y-3">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's syncing in your mind?"
                  className="post-textarea dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                />
                {previewUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-100 slide-up">
                    <img src={previewUrl} alt="Upload preview" className="w-full h-auto max-h-56 object-cover" />
                    <button type="button" onClick={handleClearImage}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full transition-all backdrop-blur-sm cursor-pointer">
                      <FiX size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-800 transition-all cursor-pointer">
                <FiImage className="text-emerald-500 text-base" />
                Add Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <button type="submit" disabled={loading} className="sync-btn">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5"><FiZap size={12} /> Sync Post</span>
                )}
              </button>
            </div>
          </form>

          {/* Posts */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="glass-card dark:bg-gray-900 dark:border-gray-800 p-10 text-center">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FiZap className="text-indigo-400 text-xl" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">No posts syncing yet</p>
                <p className="text-gray-400 text-xs mt-1">Be the first to share something!</p>
              </div>
            ) : (
              posts.map((post) => {
                const isLikedByMe = post.likes?.includes(user?.id || user?._id);
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const currentUsername = (currentUser?.username || '').toLowerCase();
                const currentId = (currentUser?.id || currentUser?._id || '').toString();
                const postUsername = (post.user?.username || '').toLowerCase();
                const postOwnerId = (post.user?._id || post.user?.id || post.user || '').toString();
                const isMyPost = (currentUsername && postUsername && currentUsername === postUsername) ||
                                 (currentId && postOwnerId && currentId === postOwnerId);
                return (
                  <div
                    key={post._id}
                    ref={postId === post._id ? highlightRef : null}
                    className={`post-card dark:bg-gray-900 dark:border-gray-800 slide-up ${postId === post._id ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {post.user?.profile?.avatarUrl && !post.user.profile.avatarUrl.includes('placeholder') ? (
                          <img src={post.user.profile.avatarUrl} alt="avatar"
                            className="w-10 h-10 rounded-full object-cover shadow-md ring-2 ring-indigo-100" />
                        ) : (
                          <div className="w-10 h-10 post-avatar rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md">
                            {post.user?.username ? post.user.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">@{post.user?.username || 'unknown_user'}</h4>
                          <p className="text-[10px] text-gray-400">{formatTimeAgo(post.createdAt)}</p>
                        </div>
                      </div>
                      {isMyPost && (
                        <div className="relative">
                          <button type="button"
                            onClick={() => setActiveMenu(activeMenu === post._id ? null : post._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer">
                            <FiMoreHorizontal size={16} />
                          </button>
                          {activeMenu === post._id && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden w-36 slide-up">
                              <button type="button"
                                onClick={() => { setEditingPost(post._id); setEditContent(post.content); setActiveMenu(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 transition-all cursor-pointer">
                                <FiEdit2 size={13} /> Edit Post
                              </button>
                              <button type="button"
                                onClick={() => { handleDelete(post._id); setActiveMenu(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer">
                                <FiTrash2 size={13} /> Delete Post
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {editingPost === post._id ? (
                      <div className="mb-4 space-y-2 slide-up">
                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                          className="post-textarea dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-20" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditSave(post._id)} className="sync-btn text-xs px-4 py-2">Save</button>
                          <button type="button" onClick={() => setEditingPost(null)}
                            className="text-xs px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">{post.content}</p>
                    )}

                    {post.imageUrl && (
                      <div className="rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-gray-700">
                        <img src={post.imageUrl} alt="Post media"
                          className="w-full h-auto max-h-[500px] object-cover hover:scale-[1.02] transition-transform duration-500" />
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button type="button" onClick={() => handleLike(post._id)}
                        className={`action-btn ${isLikedByMe ? 'action-btn-liked' : 'dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                        <FiHeart className={`text-sm ${isLikedByMe ? 'fill-current' : ''}`} />
                        <span>{post.likes?.length || 0}</span>
                      </button>
                      <button type="button"
                        onClick={() => setActiveCommentBox(activeCommentBox === post._id ? null : post._id)}
                        className={`action-btn ${activeCommentBox === post._id ? 'action-btn-comment' : 'dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                        <FiMessageCircle className="text-sm" />
                        <span>{post.comments?.length || 0}</span>
                      </button>
                    </div>

                    {activeCommentBox === post._id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 slide-up">
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                          {post.comments?.map((comment, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs border border-gray-100 dark:border-gray-700">
                              <span className="font-bold text-gray-700 dark:text-gray-200">@{comment.user?.username || 'user'} </span>
                              <span className="text-gray-500 dark:text-gray-400">{comment.text}</span>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={(e) => handleCommentSubmit(e, post._id)} className="flex items-center gap-2">
                          <input type="text" value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="comment-input dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                          />
                          <button type="submit" className="comment-send-btn cursor-pointer">
                            <FiSend size={13} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="glass-card dark:bg-gray-900 dark:border-gray-800 p-4 sticky top-24">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-4 px-1 flex items-center gap-2">
              <span className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                <FiUserPlus size={11} className="text-indigo-600" />
              </span>
              Who to follow
            </h3>
            <div className="space-y-1">
              {suggestions.map((item) => {
                const isFollowing = myFollowing.includes(item._id);
                return (
                  <div key={item._id} className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.profile?.avatarUrl && !item.profile.avatarUrl.includes('placeholder') ? (
                        <img src={item.profile.avatarUrl} alt="avatar"
                          className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-8 h-8 suggestion-avatar rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm">
                          {item.username ? item.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="truncate">
                        <h4 className="font-bold text-xs text-gray-800 dark:text-white truncate">@{item.username || 'user'}</h4>
                        <p className="text-[10px] text-gray-400 truncate">{item.email || ''}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleFollow(item._id)}
                      className={`follow-btn shrink-0 cursor-pointer ${isFollowing ? 'follow-btn-active' : ''}`}>
                      {isFollowing ? <FiUserCheck size={13} /> : <FiUserPlus size={13} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .feed-bg {
          background: #f3f4f8;
          background-image:
            radial-gradient(ellipse at 15% 15%, rgba(99,102,241,0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, rgba(139,92,246,0.06) 0%, transparent 55%);
          min-height: 100vh;
        }
        .dark .feed-bg, .dark.feed-bg {
          background: #030712;
          background-image:
            radial-gradient(ellipse at 15% 15%, rgba(99,102,241,0.1) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, rgba(139,92,246,0.08) 0%, transparent 55%);
        }
        .glass-card {
          background: rgba(255,255,255,0.96);
          border-radius: 20px;
          border: 1px solid rgba(230,230,245,0.9);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(99,102,241,0.07);
          transition: box-shadow 0.3s ease;
        }
        .glass-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.06), 0 14px 32px rgba(99,102,241,0.11);
        }
        .post-card {
          background: rgba(255,255,255,0.97);
          border-radius: 20px;
          border: 1px solid rgba(232,232,248,0.9);
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(99,102,241,0.05);
          transition: all 0.25s ease;
        }
        .post-card:hover {
          border-color: rgba(199,199,240,0.9);
          box-shadow: 0 3px 10px rgba(0,0,0,0.06), 0 14px 30px rgba(99,102,241,0.1);
          transform: translateY(-2px);
        }
        .avatar-gradient { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .post-avatar    { background: linear-gradient(135deg, #7c3aed, #a855f7); }
        .suggestion-avatar { background: linear-gradient(135deg, #0ea5e9, #6366f1); }
        .avatar-ring {
          padding: 3px;
          background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
          border-radius: 50%;
        }
        .stat-pill {
          background: #f8f9ff;
          border: 1px solid #e8eaff;
          border-radius: 14px;
          padding: 10px 8px;
          text-align: center;
          transition: all 0.2s;
          cursor: default;
        }
        .stat-pill:hover { background: #eef0ff; border-color: #c7d2fe; }
        .post-textarea {
          width: 100%;
          background: #f8f9ff;
          border: 1.5px solid #eef0ff;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 13.5px;
          resize: none;
          height: 80px;
          color: #374151;
          outline: none;
          transition: all 0.2s;
          font-family: inherit;
          box-sizing: border-box;
        }
        .post-textarea:focus {
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.09);
          background: #fff;
        }
        .post-textarea::placeholder { color: #9ca3af; }
        .sync-btn {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white;
          padding: 8px 18px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 3px 10px rgba(99,102,241,0.4);
          letter-spacing: 0.01em;
        }
        .sync-btn:hover {
          background: linear-gradient(135deg, #4f46e5, #6d28d9);
          box-shadow: 0 5px 14px rgba(99,102,241,0.5);
          transform: translateY(-1px);
        }
        .sync-btn:active { transform: scale(0.96); }
        .sync-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
        .action-btn {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; padding: 6px 12px; border-radius: 10px;
          border: none; background: transparent; color: #9ca3af;
          cursor: pointer; transition: all 0.2s; font-family: inherit; font-weight: 500;
        }
        .action-btn:hover { background: #f3f4f6; color: #6b7280; }
        .action-btn-liked { color: #f43f5e !important; background: #fff1f2 !important; font-weight: 600; }
        .action-btn-liked:hover { background: #ffe4e6 !important; }
        .action-btn-comment { color: #6366f1 !important; background: #eef2ff !important; font-weight: 600; }
        .comment-input {
          flex: 1; background: #f8f9ff; border: 1.5px solid #e5e7eb;
          border-radius: 12px; padding: 8px 12px; font-size: 12px;
          color: #374151; outline: none; transition: all 0.2s; font-family: inherit;
        }
        .comment-input:focus { border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); background: #fff; }
        .comment-send-btn {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white; padding: 9px; border-radius: 11px; border: none;
          transition: all 0.2s; box-shadow: 0 2px 8px rgba(99,102,241,0.35);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .comment-send-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.45); }
        .follow-btn {
          padding: 7px; border-radius: 10px; border: none;
          background: #eef2ff; color: #6366f1; cursor: pointer;
          transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .follow-btn:hover { background: #6366f1; color: white; transform: scale(1.08); }
        .follow-btn-active { background: #dcfce7 !important; color: #16a34a !important; }
        .follow-btn-active:hover { background: #fee2e2 !important; color: #dc2626 !important; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.28s ease-out both; }
      `}</style>
    </div>
  );
};

export default Feed;