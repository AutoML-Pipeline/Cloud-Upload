import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate("/login");
  };



  return (
    <div className="page-fullscreen">
      <div className="fixed inset-0 w-full h-screen min-h-screen min-w-full overflow-hidden bg-black z-0">
        <iframe
          src="https://my.spline.design/claritystream-4m8TT2Jyq5iFAIIaxFPl8ars/"
          frameBorder="0"
          title="ClarityStream 3D Hero"
          allowFullScreen
          className="w-full h-screen border-0 block absolute top-0 left-0 bg-black max-w-full max-h-screen overflow-hidden"
        />
        <div className="absolute inset-0 w-full h-screen flex items-center justify-center z-10 pointer-events-none">
          
          <div className="flex flex-col items-center justify-center min-w-0 max-w-[90vw] pointer-events-auto mt-0">
            <button
              onClick={handleRedirect}
              className="pointer-events-auto px-8 py-3 bg-gradient-to-r from-slate-800 to-indigo-500 text-slate-200 font-semibold rounded-xl text-[1.1rem] shadow-[0_4px_24px_rgba(99,102,241,0.25)] opacity-95 border-0 cursor-pointer tracking-wider hover:shadow-[0_8px_32px_rgba(99,102,241,0.35)] hover:from-indigo-500 hover:to-slate-800 transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
