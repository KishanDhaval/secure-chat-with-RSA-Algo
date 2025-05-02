import React, { useState } from "react";
import {
  Shield,
  User,
  Lock,
  ArrowLeft,
  UserPlus,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true)
      const response = await axios.post(
        "http://localhost:5000/api/users/register",
        { username, password }
      );
      toast.success(response.data.message || "Registered successfully!");
      navigate("/");
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Registration failed");
    }
    finally{
      setIsLoading(false)
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const navigateToLogin = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gray-700 rounded-full filter blur-3xl"></div>
          <div className="absolute top-3/4 left-3/4 w-96 h-96 bg-gray-800 rounded-full filter blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gray-600 rounded-full filter blur-3xl"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo and branding - separated from card */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <div className="flex items-center bg-gray-800 bg-opacity-5 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-800 border-opacity-80">
              <Shield className="h-5 w-5 text-emerald-400 mr-2" />
              <span className="text-xl font-bold text-white">SecureChat</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Secure. Private. Connected.</p>
        </div>

        {/* Main card */}
        <div className="bg-gray-900 bg-opacity-80 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-1">
              Create account
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              Join SecureChat to start connecting
            </p>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={18} className="text-gray-500" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-40 focus:border-emerald-500 text-white placeholder-gray-500 transition-all duration-200"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key size={18} className="text-gray-500" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full pl-10 pr-12 py-3 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-40 focus:border-emerald-500 text-white placeholder-gray-500 transition-all duration-200"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff
                          size={18}
                          className="text-gray-500 hover:text-white"
                        />
                      ) : (
                        <Eye
                          size={18}
                          className="text-gray-500 hover:text-white"
                        />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Password must be at least 8 characters long
                  </p>
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-medium rounded-xl transition-all duration-300 transform hover:shadow-lg shadow-emerald-800 shadow-opacity-20 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-opacity-70 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserPlus size={18} className="mr-2" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-800 flex items-center justify-center bg-gray-900 bg-opacity-30">
            <button
              onClick={navigateToLogin}
              className="group text-gray-400 hover:text-white text-sm font-medium transition-colors duration-200 inline-flex items-center"
            >
              <ArrowLeft
                size={14}
                className="mr-1 group-hover:-translate-x-1 transition-transform duration-200"
              />
              <span className="inline-flex items-center text-emerald-400 group-hover:text-emerald-300 mr-1">
                Back to login
              </span>
              Already have an account?
            </button>
          </div>
        </div>

        {/* Security badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center bg-gray-800 bg-opacity-70 rounded-full px-3 py-1 backdrop-blur-sm">
            <Shield size={12} className="mr-1 text-emerald-400" />
            <span>End-to-End Encrypted</span>
          </div>
          <div className="flex items-center bg-gray-800 bg-opacity-70 rounded-full px-3 py-1 backdrop-blur-sm">
            <Lock size={12} className="mr-1 text-emerald-400" />
            <span>ISO 27001 Certified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
