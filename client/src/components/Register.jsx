import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import { useNavigate } from "react-router-dom";

function Register({ switchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          username: user.displayName || user.email.split("@")[0],
          email: user.email,
          createdAt: new Date()
        });
      }

      navigate("/chat");
    } catch (err) {
      console.log("Google Auth Error:", err.message);
    }
  };

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username,
        email,
        createdAt: new Date()
      });

      navigate("/chat");
    } catch (err) {
      console.log(err.message);
      alert(err.message);
    }
  };

  return (
    <div className="auth-box">
      <h2>Register</h2>

      <button className="google-btn" onClick={handleGoogleAuth}>
        Sign up with Google
      </button>

      <div className="separator"><span>OR</span></div>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleRegister}>Register</button>

      <p className="auth-toggle" onClick={switchToLogin}>
        Already have an account? <span>Login</span>
      </p>
    </div>
  );
}

export default Register;