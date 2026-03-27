import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import { useNavigate } from "react-router-dom";

function Login({ switchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

    const handleGoogleLogin = async () => {
    try {
        await signInWithPopup(auth, provider);
        navigate("/chat");
    } catch (err) {
        console.log(err.message);
    }
    };
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.log("Login error:", err.message);
      alert(err.message);
    }
  };

  return (
    <div className="auth-box">
      <h2>Login</h2>
        <button onClick={handleGoogleLogin}>
            Continue with Google
        </button>
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

      <button onClick={handleLogin}>Login</button>

      <p className="auth-toggle" onClick={switchToRegister}>
        You don't have an account? <span>Register</span>
      </p>
    </div>
  );
}

export default Login;