import React, { useState, useRef } from "react";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast';
import GoogleAuthPopup from "../../components/GoogleAuthPopup";
import '../../auth.css';
import styles from "./AuthPage.module.css";

const Login = ({ onGoogleSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // eslint-disable-line no-unused-vars
  const [remember, setRemember] = useState(true);
  const contentRef = useRef(null);

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

  React.useEffect(() => {
    let ctx;
    let mounted = true;
    if (contentRef.current) {
      import('gsap').then(({ gsap }) => {
        if (!mounted) return;
        ctx = gsap.context(() => {
          gsap.fromTo(
            contentRef.current,
            { autoAlpha: 0, y: 26, filter: "blur(8px)", scale: 0.97 },
            { autoAlpha: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.45, ease: "power3.out" }
          );
        }, contentRef);
      });
    }
    return () => {
      mounted = false;
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.wrapper} ref={contentRef}>
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
          <div className={styles.promoTitle}>Why Automated Machine Learning Pipeline?</div>
          <div className={styles.promoList}>
            <div>• Upload from local, URL, or Google Drive</div>
            <div>• Clean, transform, and feature engineer quickly</div>
            <div>• Guided model selection and training presets</div>
            <div>• Beautiful, responsive UI built for speed</div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Login;
