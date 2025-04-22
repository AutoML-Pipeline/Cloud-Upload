import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NAVBAR_HEIGHT = 54;

const GlobalBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Don't show on dashboard or landing
  if (location.pathname === "/" || location.pathname === "/dashboard") return null;
  return (
    <button
      onClick={() => {
        // Use React Router's navigate(-1) for reliable SPA navigation
        if (window.history.length > 2) {
          navigate(-1);
        } else {
          navigate("/dashboard", { replace: true });
        }
      }}
      className="fixed left-6 z-[9999] p-1 rounded-full bg-[#23272f] hover:bg-[#374151] text-white text-base font-semibold shadow flex items-center border border-[#374151] transition"
      style={{
        fontFamily: 'Montserrat',
        boxShadow: '0 2px 12px rgba(30,41,59,0.24)',
        minWidth: 32,
        minHeight: 32,
        justifyContent: 'center',
        alignItems: 'center',
        top: `calc(${NAVBAR_HEIGHT}px + 10px)` // Always below navbar, add extra space
      }}
      title="Go Back"
    >
      {/* Lucide CircleChevronLeft icon */}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-chevron-left-icon">
        <circle cx="12" cy="12" r="10" />
        <path d="m14 16-4-4 4-4" />
      </svg>
    </button>
  );
};

export default GlobalBackButton;
