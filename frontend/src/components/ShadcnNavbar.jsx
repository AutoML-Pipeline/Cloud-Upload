import React from "react";

const navLinks = [];

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out-icon lucide-log-out mr-1 -ml-1">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const ShadcnNavbar = ({ onLogout }) => (
  <nav
    className="fixed top-0 left-0 w-full z-50 bg-[#181c24] flex items-center justify-between px-0"
    style={{
      height: 54,
      fontFamily: 'Montserrat, Poppins, Arial, sans-serif',
      boxShadow: "0 2px 12px rgba(30,41,59,0.10)",
      position: "fixed",
      zIndex: 2010, // Increased z-index to be above SideMenu
      width: "100vw",
      left: 0,
      top: 0
    }}
  >
    <div className="w-full flex items-center justify-between h-full px-8">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2">
        {/* Previous SVG Logo */}
        <span className="inline-block h-8 w-8 mr-2">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g>
              <rect x="8" y="18" width="32" height="18" rx="3" fill="#222" stroke="#bfa76a" strokeWidth="2"/>
              <ellipse cx="24" cy="27" rx="8" ry="7" fill="#a3d39c" stroke="#4e6b4c" strokeWidth="1.5"/>
              <path d="M20 27 Q21 25, 24 27 Q27 29, 28 27" stroke="#4e6b4c" strokeWidth="1" fill="none"/>
              <path d="M22 29 Q23 28, 24 29 Q25 30, 26 29" stroke="#4e6b4c" strokeWidth="1" fill="none"/>
              <g>
                <path d="M24 6 L28 10 L24 14" stroke="#e1b955" strokeWidth="2" fill="none"/>
                <path d="M24 14 Q24 16, 20 16" stroke="#e1b955" strokeWidth="2" fill="none"/>
                <path d="M20 16 Q16 16, 16 20" stroke="#e1b955" strokeWidth="2" fill="none"/>
                <path d="M16 20 Q16 24, 20 24" stroke="#e1b955" strokeWidth="2" fill="none"/>
                <path d="M20 24 Q24 24, 24 28" stroke="#e1b955" strokeWidth="2" fill="none"/>
              </g>
            </g>
          </svg>
        </span>
        {/* Modern, Sleek Title - theme-matched */}
        <span className="font-black tracking-tight" style={{
          fontSize: 18,
          letterSpacing: '-0.04em',
          color: '#f3f6fa',
          fontFamily: 'Montserrat, Poppins, Arial, sans-serif',
          textShadow: '0 2px 8px rgba(30,41,59,0.18)'
        }}>
          ML <span style={{color:'#60a5fa', fontWeight:800}}>Pipeline</span>
        </span>
      </div>
      {/* Center: Nav Links */}
      <div className="flex items-center gap-10">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={
              link.highlight
                ? "text-[#ff715b] font-semibold text-sm"
                : link.active
                  ? "text-white font-normal text-sm"
                  : "text-white/80 hover:text-white font-normal text-sm"
            }
            style={{fontFamily: 'Montserrat'}}
          >
            {link.label}
          </a>
        ))}
      </div>
      {/* Right: Logout Button */}
      <div className="flex items-center" style={{ paddingRight: 32 }}>
        <button
          onClick={onLogout}
          className="bg-[#ff4747] hover:bg-[#e12d39] text-white px-3 py-1 rounded font-semibold text-xs transition shadow flex items-center gap-2"
          style={{ fontSize: 13, minWidth: 0, minHeight: 0, lineHeight: '1.1', boxShadow: '0 1px 4px rgba(255,71,71,0.08)' }}
        >
          <LogOutIcon style={{ width: 16, height: 16 }} />Logout
        </button>
      </div>
    </div>
  </nav>
);

export default ShadcnNavbar;
