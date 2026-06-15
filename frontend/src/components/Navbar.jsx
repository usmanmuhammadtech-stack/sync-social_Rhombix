import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiHome, FiPlusSquare, FiUser, FiLogOut, FiSearch } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="text-xl font-extrabold text-[#1F2937] tracking-tight hover:opacity-90 transition-opacity">
          Sync<span className="text-[#4F46E5]">Social</span>
        </Link>

        {/* Soft Search Bar */}
        <div className="hidden sm:flex items-center bg-[#F3F4F6] rounded-xl px-3 py-1.5 w-64 border border-transparent focus-within:border-gray-200 transition-all">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search creators..."
            className="bg-transparent text-sm w-full focus:outline-none text-gray-700"
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center space-x-6 text-gray-600">
          <Link to="/" className="hover:text-[#4F46E5] transition-colors text-xl" title="Home Feed">
            <FiHome />
          </Link>
          
          <button className="hover:text-[#4F46E5] transition-colors text-xl cursor-pointer" title="Create Post">
            <FiPlusSquare />
          </button>

          <Link to="/profile" className="flex items-center space-x-2 hover:text-[#4F46E5] transition-colors" title="My Profile">
            <FiUser className="text-xl" />
            <span className="text-xs font-semibold hidden md:inline-block bg-[#EEF2F6] text-gray-700 px-2 py-0.5 rounded-md">
              @{user?.username}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="hover:text-red-500 transition-colors text-xl cursor-pointer"
            title="Logout"
          >
            <FiLogOut />
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;