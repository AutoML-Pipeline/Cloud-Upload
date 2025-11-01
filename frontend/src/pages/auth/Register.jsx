import React, { useState } from "react";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import GoogleAuthPopup from '../../components/GoogleAuthPopup';
import FeaturePanel from "../../components/FeaturePanel";
import { toast } from 'react-hot-toast';
import '../../auth.css';
import styles from "./AuthPage.module.css";

const Register = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // eslint-disable-line no-unused-vars
  const [remember, setRemember] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
  const response = await api.post("/auth/register", { name, email, password, remember_me: remember });
      const { access_token: authToken, user: userProfile } = response.data;
      if (authToken) {
        localStorage.setItem("auth_token", authToken);
      }
      if (userProfile) {
        localStorage.setItem("user", JSON.stringify(userProfile));
        onAuthSuccess && onAuthSuccess(userProfile);
      }
      toast.success("Registration successful!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
      toast.error(err.response?.data?.detail || "Registration failed");
    }
  };

  const handleGoogleSuccess = (data) => {
    const userProfile = data?.user ?? data;
    if (userProfile) {
      localStorage.setItem("user", JSON.stringify(userProfile));
      onAuthSuccess && onAuthSuccess(userProfile);
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
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Join to manage data and build models with ease</p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.input}
              placeholder="Full Name"
              autoComplete="name"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Email"
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Password"
              autoComplete="new-password"
            />
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <button type="submit" className={styles.cta}>Create Account</button>
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
            <a href="/login" className={styles.footLink}>Already have an account? Sign in</a>
          </div>
        </section>
        <aside className={styles.promo}>
          <FeaturePanel />
        </aside>
      </div>
    </div>
  );
};

export default Register;
