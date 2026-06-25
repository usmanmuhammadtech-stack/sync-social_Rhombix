import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { FiEdit2, FiCamera, FiMapPin, FiBriefcase, FiLink, FiCalendar, FiHeart, FiMessageCircle, FiShare2, FiUserPlus, FiUserCheck, FiX, FiSend, FiImage, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
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

const Profile = () => {
  const { user, token, updateUser } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeCommentBox, setActiveCommentBox] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');

  const [editForm, setEditForm] = useState({
    bio: '', location: '', website: '', company: ''
  });

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile/me', config);
      setProfileData(res.data);
      setEditForm({
        bio: res.data.bio || '',
        location: res.data.location || '',
        website: res.data.website || '',
        company: res.data.company || '',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('Profile load nahi ho saki!');
    }
  };

  const fetchMyPosts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile/my-posts', config);
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchMyPosts()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    const toastId = toast.loading('Avatar upload ho raha hai...');
    try {
      const res = await axios.post('http://localhost:5000/api/profile/upload-avatar', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setProfileData(prev => ({ ...prev, profile: { ...prev?.profile, avatarUrl: res.data.avatarUrl } }));
      updateUser({ profile: { ...user?.profile, avatarUrl: res.data.avatarUrl } });
      toast.success('Avatar update ho gaya!', { id: toastId });
    } catch (err) {
      toast.error('Avatar upload nahi hua!', { id: toastId });
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    const toastId = toast.loading('Cover upload ho raha hai...');
    try {
      const res = await axios.post('http://localhost:5000/api/profile/upload-cover', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setProfileData(prev => ({ ...prev, coverUrl: res.data.coverUrl }));
      toast.success('Cover update ho gaya!', { id: toastId });
    } catch (err) {
      toast.error('Cover upload nahi hua!', { id: toastId });
    }
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleEditSave = async () => {
    const toastId = toast.loading('Profile update ho rahi hai...');
    try {
      const res = await axios.put('http://localhost:5000/api/profile/update', editForm, config);
      setProfileData(prev => ({ ...prev, ...res.data }));
      setEditModalOpen(false);
      toast.success('Profile update ho gayi!', { id: toastId });
    } catch (err) {
      toast.error('Update nahi hua!', { id: toastId });
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${postId}/like`, {}, config);
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: res.data.likes } : p));
    } catch (err) {
      console.error('Error liking:', err);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Post delete karna chahte ho?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/posts/${postId}`, config);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success('Post delete ho gayi!');
    } catch (err) {
      toast.error('Delete nahi hua!');
    }
  };

  const handleEditSavePost = async (postId) => {
    if (!editContent.trim()) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${postId}/edit`, { content: editContent }, config);
      setPosts(prev => prev.map(p => p._id === postId ? res.data : p));
      setEditingPost(null);
      setEditContent('');
      toast.success('Post update ho gayi!');
    } catch (err) {
      toast.error('Edit nahi hua!');
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/posts/${postId}/comment`, { text: commentText }, config);
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data } : p));
      setCommentText('');
      toast.success('Comment ho gaya!', { duration: 2000 });
    } catch (err) {
      toast.error('Comment nahi hua!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen feed-bg dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-sm">Profile load ho rahi hai...</span>
          </div>
        </div>
      </div>
    );
  }

  const displayUser = {
    ...user,
    ...profileData,
    avatarUrl: profileData?.profile?.avatarUrl || profileData?.avatarUrl || user?.profile?.avatarUrl || user?.avatarUrl,
    coverUrl:  profileData?.coverUrl || user?.coverUrl,
    bio:      profileData?.profile?.bio || profileData?.bio || user?.profile?.bio || user?.bio,
    location: profileData?.location || user?.location,
    website:  profileData?.website || user?.website,
    company:  profileData?.company || user?.company,
  };

  return (
    <div className="min-h-screen feed-bg dark:bg-gray-950">
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: '12px', fontSize: '13px', fontWeight: '500', padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
        success: { style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }, iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' } },
        error: { style: { background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }, iconTheme: { primary: '#e11d48', secondary: '#fff1f2' } },
        loading: { style: { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }, iconTheme: { primary: '#6366f1', secondary: '#eef2ff' } },
      }} />

      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Profile Header Card */}
        <div className="glass-card dark:bg-gray-900 dark:border-gray-800 overflow-hidden mb-5">

          {/* Cover Photo */}
          <div className="relative h-44 cover-default">
            {displayUser?.coverUrl && (
              <img src={displayUser.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition-all backdrop-blur-sm cursor-pointer"
            >
              <FiCamera size={13} /> Edit Cover
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          </div>

          {/* Avatar + Info */}
          <div className="px-6 pb-5">
            <div className="flex justify-between items-end flex-wrap gap-3">
              {/* Avatar */}
              <div className="relative -mt-10 mb-2">
                <div className="avatar-ring cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  {displayUser?.avatarUrl ? (
                    <img src={displayUser.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 avatar-gradient rounded-full flex items-center justify-center text-white text-3xl font-bold">
                      {displayUser?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="avatar-edit-overlay rounded-full">
                    <FiCamera size={16} className="text-white" />
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full"></span>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mb-2">
                <button onClick={() => setEditModalOpen(true)} className="flex items-center gap-1.5 sync-btn text-xs px-4 py-2">
                  <FiEdit2 size={12} /> Edit Profile
                </button>
                <button className="flex items-center gap-1.5 outline-btn text-xs px-4 py-2">
                  <FiShare2 size={12} /> Share
                </button>
              </div>
            </div>

            {/* Name + Bio */}
            <h2 className="font-bold text-gray-900 dark:text-white text-xl tracking-tight">@{displayUser?.username || 'user'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{displayUser?.email || ''}</p>
            {displayUser?.bio && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{displayUser.bio}</p>}

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 mt-3">
              {displayUser?.company && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <FiBriefcase size={12} className="text-indigo-400" /> {displayUser.company}
                </span>
              )}
              {displayUser?.location && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <FiMapPin size={12} className="text-rose-400" /> {displayUser.location}
                </span>
              )}
              {displayUser?.website && (
                <a href={displayUser.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-indigo-500 hover:underline">
                  <FiLink size={12} /> {displayUser.website}
                </a>
              )}
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <FiCalendar size={12} /> Joined {new Date(displayUser?.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Stats */}
            <div className="flex gap-5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800 dark:text-white">{posts.length}</p>
                <p className="text-[10px] text-gray-400">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800 dark:text-white">{displayUser?.followers?.length || 0}</p>
                <p className="text-[10px] text-gray-400">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800 dark:text-white">{displayUser?.following?.length || 0}</p>
                <p className="text-[10px] text-gray-400">Following</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-gray-100 dark:border-gray-800 px-2">
            {['posts', 'about', 'photos'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-xs font-semibold capitalize transition-all cursor-pointer border-b-2 ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="glass-card dark:bg-gray-900 dark:border-gray-800 p-10 text-center">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FiImage className="text-indigo-400 text-xl" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Abhi tak koi post nahi</p>
                <p className="text-gray-400 text-xs mt-1">Feed pe jao aur pehli post karo!</p>
              </div>
            ) : (
              posts.map(post => {
                const isLikedByMe = post.likes?.includes(user?.id || user?._id);
                return (
                  <div key={post._id} className="post-card dark:bg-gray-900 dark:border-gray-800 slide-up">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {displayUser?.avatarUrl ? (
                          <img src={displayUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-md" />
                        ) : (
                          <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md">
                            {displayUser?.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">@{displayUser?.username || 'user'}</h4>
                          <p className="text-[10px] text-gray-400">{formatTimeAgo(post.createdAt)}</p>
                        </div>
                      </div>
                      {/* 3-dot menu */}
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
                    </div>

                    {/* Edit box */}
                    {editingPost === post._id ? (
                      <div className="mb-4 space-y-2 slide-up">
                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                          className="post-textarea dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-20" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditSavePost(post._id)} className="sync-btn text-xs px-4 py-2">Save</button>
                          <button type="button" onClick={() => setEditingPost(null)}
                            className="text-xs px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">{post.content}</p>
                    )}

                    {post.imageUrl && (
                      <div className="rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-gray-700">
                        <img src={post.imageUrl} alt="Post" className="w-full h-auto max-h-[500px] object-cover hover:scale-[1.02] transition-transform duration-500" />
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
                          <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="comment-input dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500" />
                          <button type="submit" className="comment-send-btn cursor-pointer"><FiSend size={13} /></button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <div className="glass-card dark:bg-gray-900 dark:border-gray-800 p-6 slide-up">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-5">About</h3>
            <div className="space-y-4">
              {[
                { icon: <FiBriefcase size={15} />, label: 'Company', value: displayUser?.company },
                { icon: <FiMapPin size={15} />, label: 'Location', value: displayUser?.location },
                { icon: <FiLink size={15} />, label: 'Website', value: displayUser?.website },
                { icon: <FiCalendar size={15} />, label: 'Joined', value: new Date(displayUser?.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-indigo-400">{icon}</span>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{value || <span className="text-gray-300 dark:text-gray-600 italic">Not set</span>}</p>
                  </div>
                </div>
              ))}
              {displayUser?.bio && (
                <div className="flex items-start gap-3 py-3">
                  <span className="text-indigo-400 mt-0.5"><FiEdit2 size={15} /></span>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Bio</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">{displayUser.bio}</p>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setEditModalOpen(true)} className="mt-5 sync-btn text-xs px-4 py-2 flex items-center gap-1.5">
              <FiEdit2 size={12} /> Edit Info
            </button>
          </div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <div className="glass-card dark:bg-gray-900 dark:border-gray-800 p-5 slide-up">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-4">Photos</h3>
            {posts.filter(p => p.imageUrl).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Koi photo nahi mili</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {posts.filter(p => p.imageUrl).map(post => (
                  <div key={post._id} className="aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                    <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)'}}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl slide-up border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Edit Profile</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Bio</label>
                <textarea value={editForm.bio} onChange={e => setEditForm(p => ({...p, bio: e.target.value}))}
                  placeholder="Apne baare mein kuch likho..."
                  className="post-textarea dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500 h-20 text-sm" />
              </div>
              {[
                { key: 'company', label: 'Company', placeholder: 'Kahan kaam karte ho?', icon: <FiBriefcase size={13} /> },
                { key: 'location', label: 'Location', placeholder: 'City, Country', icon: <FiMapPin size={13} /> },
                { key: 'website', label: 'Website', placeholder: 'https://yoursite.com', icon: <FiLink size={13} /> },
              ].map(({ key, label, placeholder, icon }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">{icon}</span>
                    <input type="text" value={editForm[key]}
                      onChange={e => setEditForm(p => ({...p, [key]: e.target.value}))}
                      placeholder={placeholder}
                      className="comment-input dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500 w-full pl-9" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleEditSave} className="sync-btn flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
                Save Changes
              </button>
              <button onClick={() => setEditModalOpen(false)} className="outline-btn dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex-1 py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .feed-bg {
          background: #f3f4f8;
          background-image:
            radial-gradient(ellipse at 15% 15%, rgba(99,102,241,0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, rgba(139,92,246,0.06) 0%, transparent 55%);
          min-height: 100vh;
        }
        .glass-card {
          background: rgba(255,255,255,0.96);
          border-radius: 20px;
          border: 1px solid rgba(230,230,245,0.9);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(99,102,241,0.07);
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
        .cover-default {
          background: linear-gradient(135deg, #eef2ff 0%, #ede9fe 50%, #fce7f3 100%);
        }
        .avatar-gradient { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .avatar-ring {
          padding: 3px;
          background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
          border-radius: 50%;
          display: inline-block;
          position: relative;
        }
        .avatar-edit-overlay {
          position: absolute;
          inset: 3px;
          background: rgba(0,0,0,0);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .avatar-ring:hover .avatar-edit-overlay {
          background: rgba(0,0,0,0.45);
        }
        .sync-btn {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white;
          border-radius: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 3px 10px rgba(99,102,241,0.4);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .sync-btn:hover { background: linear-gradient(135deg, #4f46e5, #6d28d9); transform: translateY(-1px); box-shadow: 0 5px 14px rgba(99,102,241,0.5); }
        .sync-btn:active { transform: scale(0.96); }
        .outline-btn {
          background: white;
          color: #6b7280;
          border-radius: 12px;
          font-weight: 600;
          font-size: 12px;
          border: 1.5px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .outline-btn:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
        .post-textarea {
          width: 100%;
          background: #f8f9ff;
          border: 1.5px solid #eef0ff;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 13.5px;
          resize: none;
          color: #374151;
          outline: none;
          transition: all 0.2s;
          font-family: inherit;
          box-sizing: border-box;
        }
        .post-textarea:focus { border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.09); background: #fff; }
        .post-textarea::placeholder { color: #9ca3af; }
        .comment-input {
          background: #f8f9ff;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          padding: 8px 12px;
          font-size: 12px;
          color: #374151;
          outline: none;
          transition: all 0.2s;
          font-family: inherit;
        }
        .comment-input:focus { border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); background: #fff; }
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
        .comment-send-btn {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white; padding: 9px; border-radius: 11px; border: none;
          transition: all 0.2s; box-shadow: 0 2px 8px rgba(99,102,241,0.35);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .comment-send-btn:hover { transform: translateY(-1px); }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.28s ease-out both; }
      `}</style>
    </div>
  );
};

export default Profile;