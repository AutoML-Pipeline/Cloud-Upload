import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";

export default function Landing() {
  const navigate = useNavigate();
  const boxRef = useRef(null);

  // Animated redirect
  const handleRedirect = () => {
    // Overlap navigation and animation for snappy feel
    gsap.to(boxRef.current, {
      scale: 1.15,
      filter: "blur(2px) brightness(1.1)",
      boxShadow: "0 0 60px 18px #6366f1, 0 0 0 0 #fff",
      opacity: 0.7,
      duration: 0.18,
      ease: "power2.inOut",
      onComplete: () => {
        // Trigger navigation at 60% of the next animation
        gsap.to(boxRef.current, {
          scale: 2.1,
          y: -80,
          filter: "blur(16px) brightness(1.5)",
          opacity: 0,
          boxShadow: "0 0 0 0 #6366f1, 0 0 0 0 #fff",
          duration: 0.44,
          ease: "expo.inOut",
          onUpdate: function() {
            if (this.progress() > 0.6 && !this.navTriggered) {
              this.navTriggered = true;
              navigate("/login");
            }
          }
        });
      }
    });
  };

  useEffect(() => {
    if (boxRef.current) {
      gsap.to(boxRef.current, {
        duration: 1.5,
        ease: "power1.inOut",
        y: 0,
        opacity: 1,
        delay: 1.5,
      });
    }
  }, []);

  // Preload Spline asset for login/register
  useEffect(() => {
    const preloadSpline = () => {
      const SPLINE_URL = "https://my.spline.design/cubes-11XksX5PbLLeQrFYk69YghaQ/";
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'fetch';
      link.href = SPLINE_URL;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    };
    preloadSpline();
  }, []);

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
          src="https://my.spline.design/claritystream-4m8TT2Jyq5iFAIIaxFPl8ars/"
          frameBorder="0"
          title="ClarityStream 3D Hero"
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
            maxWidth: "100vw",
            maxHeight: "100vh",
            overflow: "hidden"
          }}
        />
        <div
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
          }}
        >
          <div
            ref={boxRef}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 0,
              maxWidth: "90vw",
              pointerEvents: "auto",
              transition: "box-shadow 0.2s, background 0.2s",
              marginTop: 0,
              opacity: 0,
              y: 100,
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
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
