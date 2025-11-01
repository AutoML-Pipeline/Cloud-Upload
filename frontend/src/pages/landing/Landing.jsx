import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate("/login");
  };



  return (
    <div className="page-fullscreen">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100vh",
          minHeight: "100vh",
          minWidth: "100%",
          overflow: "hidden",
          background: "black",
          zIndex: 0,
        }}
      >
        <iframe
          src="https://my.spline.design/claritystream-4m8TT2Jyq5iFAIIaxFPl8ars/"
          frameBorder="0"
          title="ClarityStream 3D Hero"
          allowFullScreen
          style={{
            width: "100%",
            height: "100vh",
            border: "none",
            display: "block",
            position: "absolute",
            top: 0,
            left: 0,
            background: "black",
            maxWidth: "100%",
            maxHeight: "100vh",
            overflow: "hidden"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 0,
              maxWidth: "90vw",
              pointerEvents: "auto",
              marginTop: 0,
              animation: "simpleFadeIn 0.4s ease-out",
            }}
          >
            <button
              onClick={handleRedirect}
              style={{
                pointerEvents: "auto",
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
                letterSpacing: "0.05em",
              }}
              onMouseOver={e => {
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.35)";
                e.currentTarget.style.background = "linear-gradient(90deg, #6366f1 0%, #1e293b 100%)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(99,102,241,0.25)";
                e.currentTarget.style.background = "linear-gradient(90deg, #1e293b 0%, #6366f1 100%)";
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
