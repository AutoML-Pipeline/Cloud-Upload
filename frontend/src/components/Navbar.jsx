import React from "react";

const PipelineLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="#4F46E5"/>
    <rect x="8" y="13" width="16" height="6" rx="3" fill="#fff"/>
    <rect x="13" y="8" width="6" height="16" rx="3" fill="#fff"/>
  </svg>
);

const Navbar = ({ onLogout }) => (
  <nav className="flex items-center justify-between bg-indigo-700 px-6 py-3 shadow-md relative">
    <div className="flex items-center gap-3">
      <PipelineLogo />
      <span className="text-white text-2xl font-bold tracking-tight select-none">ML Pipeline</span>
    </div>
    <button
      onClick={onLogout}
      className="bg-white text-indigo-700 font-semibold px-4 py-2 rounded hover:bg-indigo-100 transition"
    >
      Logout
    </button>
  </nav>
);

export default Navbar;
