import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast';
import GoogleAuthPopup from "../components/GoogleAuthPopup";
import '../auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // eslint-disable-line no-unused-vars
  const contentRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post("http://localhost:8000/auth/login", { email, password });
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
      toast.error(err.response?.data?.detail || "Login failed");
    }
  };

  const handleGoogleSuccess = (data) => {
    localStorage.setItem("user", JSON.stringify(data));
    toast.success("Login successful!");
    navigate("/dashboard");
  };

  const handleGoogleError = (error) => {
    toast.error("Google login failed: " + error);
  };

  React.useEffect(() => {
    if (contentRef.current) {
      import('gsap').then(({ gsap }) => {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 52, filter: "blur(16px)", scale: 0.93 },
          { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.6, ease: "power2.out" }
        );
      });
    }
  }, []);

  return (
    <div className="page-center">
      <div className="auth-card" ref={contentRef}>
        <div className="auth-title">Login</div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="auth-input"
            placeholder="Username or E-mail"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="auth-input"
            placeholder="Password"
            autoComplete="current-password"
          />
          <button type="submit" className="auth-btn">Sign In</button>
        </form>
        <div style={{ width: '80%', marginTop: 22 }}>
          <GoogleAuthPopup
            backendUrl="http://localhost:8000"
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            className="auth-google"
          />
          <a href="/register" className="auth-link">Sign up</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
