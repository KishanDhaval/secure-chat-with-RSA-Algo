import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import CryptoJS from "crypto-js";
import toast from "react-hot-toast";
import { Shield, LogOut, MessageSquare, User, UserPlus, Users, Send, X, Lock, Zap } from "lucide-react";

const socket = io("http://localhost:5000", { autoConnect: false });

const Chat = () => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    if (!token || !username) {
      toast.error("Please log in first.");
      navigate("/");
      return;
    }

    setLoggedInUser(username);
    fetchUsers(username);
    fetchOnlineUsers();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join", username);

    socket.on("receive-connection-request", ({ sender, aesKey }) => {
      setIncomingRequest(sender);
      localStorage.setItem("aesKey", aesKey);
      console.log(` [Key Receiving] Received AES Key from ${sender}:`, aesKey);
    });

    socket.on("connection-accepted", ({ receiver }) => {
      setSelectedUser(receiver);
      toast.success(`Connected with ${receiver}`);
    });

    socket.on("connection-rejected", ({ receiver }) => {
      toast.error(`${receiver} rejected your connection request.`);
    });

    socket.on("receiveMessage", ({ sender, text }) => {
      console.log(` [Decryption] Received Encrypted Message from ${sender}:`, `\n- Encrypted Message: "${text}"`);
      const decryptedMessage = decryptMessage(text);
      console.log(` [Decryption] Decrypted Message:`, `\n- Decrypted Message: "${decryptedMessage}"`);
      setMessages((prev) => [...prev, { sender, text: decryptedMessage }]);
    });

    // Update online users every 30 seconds
    const interval = setInterval(fetchOnlineUsers, 30000);

    // Clean up
    return () => {
      socket.off("receive-connection-request");
      socket.off("connection-accepted");
      socket.off("connection-rejected");
      socket.off("receiveMessage");
      clearInterval(interval);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  const generateAESKey = () => {
    let key = localStorage.getItem("aesKey");
    if (!key) {
      key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
      localStorage.setItem("aesKey", key);
      console.log(" [Key Generation] New AES Key Generated:", key);
    } else {
      console.log(" [Key Generation] Using Existing AES Key:", key);
    }
    return key;
  };

  let aesKey = localStorage.getItem("aesKey");

  const encryptMessage = (message, key) => {
    return CryptoJS.AES.encrypt(message, key).toString();
  };

  const decryptMessage = (encryptedMessage) => {
    const key = localStorage.getItem("aesKey");
    if (!key) {
      console.error(" [Decryption Failed] AES Key Missing!");
      return "[Decryption Failed: Key Missing]";
    }

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) {
        console.error("🔓 [Decryption Failed] Invalid Key or Message!");
        return "[Decryption Failed]";
      }
      return decryptedText;
    } catch (error) {
      console.error("🔓 [Decryption Failed] Error:", error);
      return "[Decryption Failed]";
    }
  };

  const fetchUsers = async (currentUser) => {
    try {
      const response = await axios.get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers(response.data.filter((user) => user.username !== currentUser));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to fetch users");
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/users/online");
      const onlineStatus = response.data.reduce((acc, user) => {
        acc[user.username] = user.isOnline;
        return acc;
      }, {});
      setOnlineUsers(onlineStatus);
    } catch (error) {
      console.error("Failed to fetch online users:", error);
    }
  };

  const handleConnect = (receiverUsername) => {
    aesKey = generateAESKey();
    socket.emit("send-connection-request", {
      sender: loggedInUser,
      receiver: receiverUsername,
      aesKey,
    });
    console.log(`🔑 [Key Sharing] Sending AES Key to ${receiverUsername}:`, aesKey);
    toast.success(`Connection request sent to ${receiverUsername}`);
  };

  const acceptRequest = () => {
    if (incomingRequest) {
      const aesKey = localStorage.getItem("aesKey");
      socket.emit("connection-response", {
        sender: incomingRequest,
        receiver: loggedInUser,
        accepted: true,
        aesKey,
      });
      setSelectedUser(incomingRequest);
      setIncomingRequest(null);
      toast.success(`Connected with ${incomingRequest}`);
    }
  };

  const rejectRequest = () => {
    if (incomingRequest) {
      socket.emit("connection-response", {
        sender: incomingRequest,
        receiver: loggedInUser,
        accepted: false,
      });
      setIncomingRequest(null);
      toast.error(`Rejected connection request from ${incomingRequest}`);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedUser) {
      const encryptedMessage = encryptMessage(newMessage, aesKey);
      console.log(
        ` [Encryption] Encrypting Message:`,
        `\n- Original Message: "${newMessage}"`,
        `\n- Encrypted Message: "${encryptedMessage}"`
      );
      socket.emit("sendMessage", {
        sender: loggedInUser,
        receiver: selectedUser,
        text: encryptedMessage,
      });
      setMessages((prev) => [...prev, { sender: loggedInUser, text: newMessage }]);
      setNewMessage("");
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You're already logged out.");
        navigate("/");
        return;
      }
      const { username } = JSON.parse(atob(token.split(".")[1]));
      await axios.post("http://localhost:5000/api/users/logout", { username });
      localStorage.clear();
      toast.success("Logout successful!");
      navigate("/");
    } catch (error) {
      console.error("Failed to log out:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  // Format timestamp for messages
  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // Group messages by date
  const messagesByDate = messages.reduce((groups, message) => {
    const date = new Date().toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push({...message, time: formatTime()});
    return groups;
  }, {});

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="h-16 px-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 mr-2 rounded-full hover:bg-gray-700 md:hidden"
          >
            <Users size={20} />
          </button>
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-emerald-500 mr-2" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">SecureChat</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center bg-gray-700/40 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-300">{loggedInUser}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400 p-2 rounded-full transition-colors duration-200"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* User Sidebar */}
        <aside className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 bg-gray-850 border-r border-gray-700 overflow-hidden transition-all duration-300`}>
          <div className="p-4 border-b border-gray-700/50">
            <div className="relative">
              <Users className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search users..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-700/30 text-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 mb-2">Online Users</h3>
            {users.length > 0 ? (
              <div className="space-y-1">
                {users.filter(user => onlineUsers[user.username]).map((user) => (
                  <div
                    key={user._id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedUser === user.username
                        ? "bg-gradient-to-r from-blue-600/40 to-emerald-600/40 text-white"
                        : "hover:bg-gray-800/60 text-gray-300"
                    }`}
                    onClick={() => selectedUser !== user.username && handleConnect(user.username)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-gray-300">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-gray-800"></div>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.username}</p>
                        <p className="text-xs text-emerald-400">Online</p>
                      </div>
                    </div>
                    
                    {selectedUser !== user.username && (
                      <button className="text-blue-400 p-1.5 rounded-full hover:bg-blue-500/20">
                        <UserPlus size={16} />
                      </button>
                    )}
                    
                    {selectedUser === user.username && (
                      <div className="flex items-center space-x-1">
                        <Lock className="text-emerald-400" size={14} />
                        <span className="text-xs text-emerald-400">Secure</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 bg-gray-800/30 rounded-lg">
                <p className="text-gray-500 text-sm">No online users found</p>
              </div>
            )}
            
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 mt-6 mb-2">Offline Users</h3>
            <div className="space-y-1">
              {users.filter(user => !onlineUsers[user.username]).map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-2 rounded-lg text-gray-500 hover:bg-gray-800/60"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-500">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gray-600 border-2 border-gray-800"></div>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.username}</p>
                      <p className="text-xs">Offline</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-900">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 flex items-center justify-between border-b border-gray-700/50 bg-gray-800/50">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-gray-200">
                      {selectedUser[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-gray-800"></div>
                  </div>
                  <div>
                    <h2 className="font-medium text-gray-100">{selectedUser}</h2>
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <p className="text-xs text-emerald-400">Online now</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center px-2 py-1 bg-emerald-500/10 rounded text-xs text-emerald-400">
                    <Lock size={12} className="mr-1" />
                    <span>Encrypted</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setMessages([]);
                      localStorage.removeItem("aesKey");
                      toast.success("Disconnected from chat");
                    }}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors duration-200"
                    title="Disconnect"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 bg-gradient-to-b from-gray-900 to-gray-800/90">
                {messages.length > 0 ? (
                  Object.keys(messagesByDate).map(date => (
                    <div key={date}>
                      <div className="flex justify-center mb-6">
                        <div className="px-3 py-1 bg-gray-800/80 rounded-full">
                          <span className="text-xs text-gray-400">{date}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {messagesByDate[date].map((msg, index) => (
                          <div
                            key={index}
                            className={`flex ${msg.sender === loggedInUser ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2.5 ${
                              msg.sender === loggedInUser
                                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-tr-none"
                                : "bg-gray-800 text-gray-100 rounded-tl-none"
                            }`}>
                              <div className="flex items-center space-x-2 mb-1">
                                {msg.sender !== loggedInUser && (
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center text-xs">
                                    {msg.sender[0].toUpperCase()}
                                  </div>
                                )}
                                <p className="text-xs opacity-75">{msg.time}</p>
                              </div>
                              <p className="text-sm">{msg.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md p-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-300 mb-2">Start Messaging</h3>
                      <p className="text-gray-400 text-sm">
                        Your conversation with {selectedUser} is secured with end-to-end encryption
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-700/50 bg-gray-800/50">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a secure message..."
                      className="w-full pl-4 pr-10 py-3 bg-gray-700/30 border border-gray-700/50 rounded-lg text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <div className="absolute right-3 top-3 text-gray-400">
                      <Lock size={16} />
                    </div>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-lg transition-colors duration-300 disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center max-w-md p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent mb-4">
                  SecureChat
                </h2>
                <p className="text-gray-400 mb-6">
                  Select a user from the sidebar to start an encrypted conversation. All messages are secured with end-to-end encryption.
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2 bg-gray-800/60 px-3 py-2 rounded-lg">
                    <Lock className="text-emerald-500" size={16} />
                    <span className="text-gray-300">End-to-End Encryption</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-800/60 px-3 py-2 rounded-lg">
                    <Zap className="text-blue-500" size={16} />
                    <span className="text-gray-300">Real-time Messaging</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Connection Request Modal */}
      {incomingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Connection Request</h3>
              <p className="text-gray-300 mb-2">{incomingRequest} wants to start a secure chat with you</p>
              <p className="text-xs text-gray-400 mb-6 flex items-center justify-center">
                <Lock size={12} className="mr-1" />
                End-to-end encrypted conversation
              </p>
            </div>
            <div className="flex border-t border-gray-700">
              <button
                onClick={rejectRequest}
                className="flex-1 p-4 text-red-400 font-medium hover:bg-red-500/10 transition-colors duration-200"
              >
                Decline
              </button>
              <button
                onClick={acceptRequest}
                className="flex-1 p-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium hover:from-blue-700 hover:to-emerald-700 transition-colors duration-200"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;