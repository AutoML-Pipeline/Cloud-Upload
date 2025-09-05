import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import GoogleAuthPopup from '../components/GoogleAuthPopup';
import { toast } from 'react-hot-toast';
import '../auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // eslint-disable-line no-unused-vars
  const contentRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post("http://localhost:8000/auth/register", { name, email, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
      toast.error(err.response?.data?.detail || "Registration failed");
    }
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
        <div className="auth-title">Register</div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="auth-input"
            placeholder="Name"
            autoComplete="name"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="auth-input"
            placeholder="Email"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="auth-input"
            placeholder="Password"
            autoComplete="new-password"
          />
          <button type="submit" className="auth-btn">Register</button>
        </form>
        <div style={{ width: '80%', marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GoogleAuthPopup
            backendUrl="http://localhost:8000"
            onSuccess={() => window.location.href = "/dashboard"}
            onError={err => alert("Google login failed: " + err)}
            askForConsent={true}
            className="auth-google"
          />
          <a href="/login" className="auth-link">Already have an account? Login</a>
        </div>
      </div>
    </div>
  );
};

export default Register;
