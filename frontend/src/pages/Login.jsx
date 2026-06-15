import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FiMail, FiLock } from 'react-icons/fi';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Backend login endpoint call
      const res = await axios.post('http://localhost:5000/api/auth/login', formData);
      
      // Context state update aur localStorage me token save
      login(res.data.user, res.data.token);
      navigate('/'); // Login hote hi home/feed page pr redirect
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] px-4 fade-in">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-[#1F2937] tracking-tight">Welcome Back</h2>
          <p className="text-sm text-gray-500 mt-2">Log in to sync with your world.</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <FiMail />
              </span>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="ali@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:outline-none focus:border-[#4F46E5] text-sm transition-colors text-gray-800"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <FiLock />
              </span>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:outline-none focus:border-[#4F46E5] text-sm transition-colors text-gray-800"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium rounded-xl text-sm transition-colors shadow-sm focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {/* Redirect to Register */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#4F46E5] font-semibold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;