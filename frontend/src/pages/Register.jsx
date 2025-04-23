import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import GoogleAuthPopup from '../components/GoogleAuthPopup';
import { toast } from 'react-hot-toast';

// Spline preloading helper (for SSR or fallback)
export const SPLINE_URL = "https://my.spline.design/cubes-11XksX5PbLLeQrFYk69YghaQ/";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [splineLoaded, setSplineLoaded] = useState(false);
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

  // Animate in content when Spline iframe loads
  React.useEffect(() => {
    if (splineLoaded && contentRef.current) {
      import('gsap').then(({ gsap }) => {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 52, filter: "blur(16px)", scale: 0.93 },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            scale: 1,
            duration: 1.15,
            ease: "expo.inOut"
          }
        );
      });
    }
  }, [splineLoaded]);

  return (
    <div className="page-fullscreen">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          minHeight: "100vh",
          minWidth: "100vw",
          overflow: "hidden",
          background: "black",
          zIndex: 0,
        }}
      >
        <iframe
          src={SPLINE_URL}
          frameBorder="0"
          title="Cubes 3D Background"
          allowFullScreen
          style={{
            width: "100vw",
            height: "100vh",
            border: "none",
            display: "block",
            position: "absolute",
            top: 0,
            left: 0,
            background: "black",
            zIndex: 0,
            opacity: splineLoaded ? 1 : 0,
            transition: "opacity 0.38s cubic-bezier(.77,0,.18,1)"
          }}
          onLoad={() => setSplineLoaded(true)}
        />
        <div
          ref={contentRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            pointerEvents: "none",
            opacity: splineLoaded ? 1 : 0,
            filter: splineLoaded ? "none" : "blur(12px)",
            transition: "opacity 0.2s, filter 0.2s"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              padding: "2.5rem 2rem 2rem 2rem",
              borderRadius: "1.25rem",
              background: "rgba(24, 28, 37, 0.68)",
              boxShadow: "0 8px 32px rgba(30,41,59,0.45)",
              backdropFilter: "blur(12px)",
              pointerEvents: "auto",
              border: "1.5px solid rgba(99,102,241,0.16)",
              transition: "background 0.3s, box-shadow 0.3s"
            }}
          >
            <form style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", maxWidth: 340, margin: "0 auto", boxSizing: "border-box", fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Roboto', Arial, sans-serif", color: "#e0e7ef", fontWeight: 500, fontSize: 16 }} onSubmit={handleSubmit}>
              {/* Name input without label */}
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: 340,
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #334155",
                    background: "rgba(30,41,59,0.85)",
                    color: "#e0e7ef",
                    fontSize: 16,
                    outline: "none",
                    marginTop: 2,
                    boxSizing: "border-box",
                    fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Roboto', Arial, sans-serif",
                    fontWeight: 500
                  }}
                  placeholder="Name"
                />
              </div>
              {/* Email input without label */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: 340,
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #334155",
                    background: "rgba(30,41,59,0.85)",
                    color: "#e0e7ef",
                    fontSize: 16,
                    outline: "none",
                    marginTop: 2,
                    boxSizing: "border-box",
                    fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Roboto', Arial, sans-serif",
                    fontWeight: 500
                  }}
                  placeholder="Email"
                />
              </div>
              {/* Password input without label */}
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: 340,
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #334155",
                    background: "rgba(30,41,59,0.85)",
                    color: "#e0e7ef",
                    fontSize: 16,
                    outline: "none",
                    marginTop: 2,
                    boxSizing: "border-box",
                    fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Roboto', Arial, sans-serif",
                    fontWeight: 500
                  }}
                  placeholder="Password"
                />
              </div>
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "0.75rem 2rem",
                  background: "linear-gradient(90deg, #1e293b 0%, #6366f1 100%)",
                  color: "#e0e7ef",
                  fontWeight: 600,
                  borderRadius: "0.75rem",
                  fontSize: "1.1rem",
                  boxShadow: "0 4px 24px rgba(99,102,241,0.25)",
                  opacity: 0.96,
                  border: "none",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s, background 0.2s",
                  letterSpacing: "0.05em",
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = "scale(1.07)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.35)";
                  e.currentTarget.style.background = "linear-gradient(90deg, #6366f1 0%, #1e293b 100%)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(99,102,241,0.25)";
                  e.currentTarget.style.background = "linear-gradient(90deg, #1e293b 0%, #6366f1 100%)";
                }}
              >
                Register
              </button>
            </form>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Google sign in/register button */}
              <GoogleAuthPopup
                backendUrl="http://localhost:8000"
                onSuccess={() => window.location.href = "/dashboard"}
                onError={err => alert("Google login failed: " + err)}
                askForConsent={true}
              />
              <a href="/login" style={{ color: "#818cf8", textAlign: "center", fontSize: 14, textDecoration: "underline dotted", marginTop: 6 }}>
                Already have an account? Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
