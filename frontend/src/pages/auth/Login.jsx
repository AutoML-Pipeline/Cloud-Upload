import React, { useState } from "react";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast';
import GoogleAuthPopup from "../../components/GoogleAuthPopup";
import FeaturePanel from "../../components/FeaturePanel";
import '../../auth.css';
import styles from "./AuthPage.module.css";

const Login = ({ onGoogleSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // eslint-disable-line no-unused-vars
  const [remember, setRemember] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
  const response = await api.post("/auth/login", { email, password, remember_me: remember });
      const { access_token: authToken, user: userProfile } = response.data;
      if (authToken) {
        localStorage.setItem("auth_token", authToken);
      }
      if (userProfile) {
        localStorage.setItem("user", JSON.stringify(userProfile));
        if (onGoogleSuccess) {
          onGoogleSuccess(userProfile);
        }
      }
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
      toast.error(err.response?.data?.detail || "Login failed");
    }
  };

  const handleGoogleSuccess = (data) => {
    const userProfile = data?.user ?? data;
    if (userProfile) {
      localStorage.setItem("user", JSON.stringify(userProfile));
      onGoogleSuccess && onGoogleSuccess(userProfile);
    }
    toast.success("Login successful!");
    navigate("/dashboard");
  };

  const handleGoogleError = (error) => {
    toast.error("Google login failed: " + error);
  };

  // Animations removed for instant load

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <section className={styles.card}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue your AutoML workflow</p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Email"
              autoComplete="username"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Password"
              autoComplete="current-password"
            />
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <button type="submit" className={styles.cta}>Sign In</button>
          </form>
          <div className={styles.alt}>
            <div className={styles.googleBtn}>
              <GoogleAuthPopup
                backendUrl="http://localhost:8000"
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                className="auth-google"
              />
            </div>
            <a href="/register" className={styles.footLink}>Create an account</a>
          </div>
        </section>
        <aside className={styles.promo}>
          <FeaturePanel />
        </aside>
      </div>
    </div>
  );
};

export default Login;
