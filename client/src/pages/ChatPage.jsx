import React, { useEffect, useRef, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  where,
  getDocs
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import "../App.css";
import io from "socket.io-client";

function ChatPage({ user }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [activeRoom, setActiveRoom] = useState("general");
  const [socket, setSocket] = useState(null);
  const rooms = ["general", "programming", "gaming", "chill"];
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const endRef = useRef(null);
  useEffect(() => {
  if (!socket) return;

  socket.on("update_user_list", (users) => {
    const uniqueUsers = users.reduce((acc, current) => {
      const x = acc.find(item => item.uid === current.uid);
      if (!x) return acc.concat([current]);
      else return acc;
    }, []);
    
    setOnlineUsers(uniqueUsers);
  });

  return () => socket.off("update_user_list");
}, [socket]);
  useEffect(() => {
    const setupSocket = async () => {

      const token = await auth.currentUser.getIdToken();

      const newSocket = io("https://chatapp-psws.onrender.com", {
        auth: { token },
        transports: ["websocket"]
      });

      setSocket(newSocket);
    };

    setupSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!socket) return;

  socket.emit("join_room", activeRoom);
    setMessages([]);
  const fetchHistory = async () => {
    const q = query(
      collection(db, "messages"),
      where("roomId", "==", activeRoom),
      orderBy("createdAt", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    
    const history = querySnapshot.docs.map(doc => doc.data());
    setMessages(history);
  };

  fetchHistory();
}, [activeRoom, socket]);

useEffect(() => {
  if (!socket) return;

  const handleMessage = (data) => {
    if (data.roomId === activeRoom) {
      setMessages((prev) => [...prev, data]);
    } else {
      setUnreadCounts((prev) => ({
        ...prev,
        [data.roomId]: (prev[data.roomId] || 0) + 1,
      }));
    }
  };

  socket.on("receive_message", handleMessage);
  return () => socket.off("receive_message", handleMessage);
}, [socket, activeRoom]);

useEffect(() => {
  setUnreadCounts((prev) => {
    if (prev[activeRoom] === 0) return prev;
    return {
      ...prev,
      [activeRoom]: 0,
    };
  });
}, [activeRoom]);
const sendMessage = async () => {
  if (!message.trim() || !socket) return;

  const messageData = {
    roomId: activeRoom,
    author: user.displayName || user.email.split("@")[0],
    text: message,
    uid: user.uid,
    createdAt: new Date().toISOString(),
  };

  await addDoc(collection(db, "messages"), {
    ...messageData,
    createdAt: new Date()
  });

  socket.emit("send_message", messageData);

  setMessage("");
};

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Rooms</h3>
        </div>
        <div className="rooms-list">
  {rooms.map((room) => (
    <div
      key={room}
      className={`room-item ${activeRoom === room ? "active" : ""}`}
      onClick={() => setActiveRoom(room)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <span># {room}</span>
      
      {unreadCounts[room] > 0 && (
    <span className="unread-badge">
      {unreadCounts[room]}
    </span>
  )}
    </div>
  ))}
</div>
        <div className="online-users">
            <h4>Online ({onlineUsers.length}):</h4>
            <div className="user-list-container">
              {onlineUsers.map((u) => (
                <div key={u.uid} className="user-item">
                  <div className="avatar">
                    {u.name?.charAt(0) || u.email.charAt(0)}
                    <span className="online-status"></span>
                  </div>
                  <span>{u.name} {u.uid === user.uid && "(You)"}</span>
                </div>
              ))}
            </div>
          </div>
        <div className="sidebar-footer">
           <button onClick={() => signOut(auth)}>Logout</button>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-user">
            <div className="avatar">
              {user.displayName?.charAt(0) || user.email.charAt(0)}
            </div>
            <div>
              <h4>{user.displayName || user.email}</h4>
              <span>online • #{activeRoom}</span>
            </div>
          </div>
        </div>

        <div className="chat-body">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`msg ${m.uid === user.uid ? "me" : "other"}`}
            >
              <div className="msg-author">{m.author}</div>
              <div className="msg-text">{m.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="chat-input">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Poruka u #${activeRoom}...`}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;