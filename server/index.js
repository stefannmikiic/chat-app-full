const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const admin = require("firebase-admin");
const onlineUsers = new Map();
require('dotenv').config();

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://chatapp-front-eyqj.onrender.com",
    methods: ["GET", "POST"],
    credentials: true
  },
});
app.use(cors({origin: "https://chatapp-front-eyqj.onrender.com"}));
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.user = decodedToken;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`User Authenticated: ${socket.user.email}`);

  const userData = {
    uid: socket.user.uid,
    email: socket.user.email,
    name: socket.user.name || socket.user.email.split("@")[0]
  };

  onlineUsers.set(socket.id, userData);
  io.emit("update_user_list", Array.from(onlineUsers.values()));

  socket.on("join_room", (roomId) => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(roomId);
    console.log(`User ${socket.user.email} joined room: ${roomId}`);
  });

  socket.on("send_message", (data) => {
    const secureData = {
      ...data,
      uid: socket.user.uid,
      author: socket.user.name || socket.user.email.split("@")[0]
    };
    io.emit("receive_message", secureData);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("update_user_list", Array.from(onlineUsers.values()));
    console.log("User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3001; 

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});