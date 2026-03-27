const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const onlineUsers = new Map();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

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

server.listen(3001, () => {
  console.log("SERVER RUNNING ON PORT 3001");
});