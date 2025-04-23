import React, { useState, useEffect, useRef } from "react";
import Button from "../components/Button";
import ShadcnNavbar from "../components/ShadcnNavbar";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import DashboardCarousel from "../components/DashboardCarousel";
import SideMenu from "../components/SideMenu";
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [showCloudUpload, setShowCloudUpload] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Load user and token from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      setAccessToken(parsed.access_token);
    }
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("http://localhost:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(res.data.message || "Uploaded!");
    } catch (e) {
      setMessage(e.response?.data?.error || "Upload failed");
    }
    setUploading(false);
  };

  // Upload from URL handler
  const handleUploadUrl = async () => {
    if (!uploadUrl) return setMessage("Please enter a URL.");
    setUploading(true);
    setMessage("");
    try {
      const userData = localStorage.getItem("user");
      const accessToken = userData ? JSON.parse(userData).access_token : null;
      const headers = {
        "Content-Type": "application/json",
      };
      if (uploadUrl.includes("drive.google.com") && accessToken) {
        headers["access_token"] = accessToken;
      }
      const res = await fetch("http://localhost:8000/upload-from-url", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: uploadUrl, filename: file ? file.name : undefined }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage("Upload failed: " + data.error);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const handleDriveAction = async () => {
    if (!accessToken) {
      alert("You must sign in with Google first.");
      return;
    }
    // Example fetch to your backend, which can use the token
    // Or use gapi client directly if you want frontend access
    // fetch('/api/drive-action', { headers: { Authorization: `Bearer ${accessToken}` } })
    alert("Ready to use Google Drive with stored token!");
  };

  const handleLogout = () => {
    // Remove all possible auth tokens and user info
    localStorage.removeItem("user");
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("access_token");
    sessionStorage.clear();
    setUser(null);
    setAccessToken(null);
    toast.success("Logged out successfully!");
    // Use navigate to ensure React Router handles redirect
    navigate("/", { replace: true });
    // As fallback, force reload to ensure state is cleared
    setTimeout(() => window.location.replace("/"), 100);
  };

  const handleProviderLogin = (provider) => {
    let url = "";
    if (provider === "google") url = "http://localhost:8000/auth/google/login";
    if (provider === "onedrive") url = "http://localhost:8000/auth/onedrive/login";
    if (provider === "box") url = "http://localhost:8000/auth/box/login";
    // For S3, show a form for credentials
    if (url) window.open(url, "_blank", "width=500,height=700");
  };

  // Helper style for hoverable dashboard buttons
  const hoverBtn = {
    background: 'linear-gradient(90deg, #1e293b 0%, #6366f1 100%)',
    color: '#e0e7ef',
    fontWeight: 600,
    borderRadius: 12,
    fontSize: 18,
    padding: '0.75rem 2rem',
    border: 'none',
    boxShadow: '0 4px 24px rgba(99,102,241,0.18)',
    cursor: 'pointer',
    transition: 'transform 0.18s, box-shadow 0.18s, background 0.18s',
    letterSpacing: '0.04em',
  };
  const hoverBtnActive = {
    transform: 'scale(1.07)',
    boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
    background: 'linear-gradient(90deg, #6366f1 0%, #1e293b 100%)',
  };

  function HoverButton({children, ...props}) {
    const [hover, setHover] = React.useState(false);
    return (
      <button
        style={hover ? {...hoverBtn, ...hoverBtnActive} : hoverBtn}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
        {...props}
      >
        {children}
      </button>
    );
  }

  // Card options for dashboard actions
  const cardOptions = [
    {
      label: "Upload File",
      description: "Upload a file from your device.",
      icon: "📁",
      onClick: () => navigate("/upload-file")
    },
    {
      label: "Upload from URL",
      description: "Paste a URL to upload a file.",
      icon: "🔗",
      onClick: () => navigate("/upload-url")
    },
    {
      label: "Upload from Cloud",
      description: "Connect your cloud storage (Drive, etc.) and upload.",
      icon: "☁️",
      onClick: () => navigate("/upload-cloud")
    },
    {
      label: "Upload from SQL Workbench",
      description: "Connect to a SQL database, select data, and upload to MinIO.",
      icon: "🗄️",
      onClick: () => navigate("/upload-sqlworkbench")
    }
  ];

  // 2x2 grid card display, modern and fits theme
  function CardGrid({ cards }) {
    if (!cards || !cards.length) return null;
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '32px',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        padding: '12px 0',
        justifyItems: 'center',
        alignItems: 'center',
      }}>
        {cards.slice(0, 4).map((card, idx) => (
          <div key={idx} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #22304a 75%, #1e293b 100%)',
            borderRadius: 22,
            boxShadow: '0 4px 18px #60a5fa22',
            padding: '2.2rem 1.2rem 2.2rem 1.2rem',
            minHeight: 230,
            minWidth: 210,
            maxWidth: 210,
            width: '210px',
            height: '230px',
            color: '#f1f5f9', fontWeight: 600,
            border: '2.5px solid #60a5fa',
            transition: 'box-shadow 0.18s, border 0.18s',
            boxSizing: 'border-box',
          }}>
            <span style={{ fontSize: 42, marginBottom: 16 }}>{card.icon}</span>
            <span style={{ marginBottom: 10, textAlign: 'center', fontWeight: 700, fontSize: 20 }}>{card.label}</span>
            <span style={{ fontSize: 14, color: '#a3aed6', fontWeight: 400, textAlign: 'center' }}>{card.description}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page-fullscreen">
      <SideMenu />
      <div style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginLeft: 240 }}>
        {/* Spline animated background */}
        <iframe
          src="https://my.spline.design/cubes-11XksX5PbLLeQrFYk69YghaQ/"
          frameBorder="0"
          title="Spline 3D Background"
          allowFullScreen
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 0,
            pointerEvents: 'none',
            background: 'transparent',
            maxWidth: '100vw',
            maxHeight: '100vh',
            overflow: 'hidden'
          }}
        />
        <ShadcnNavbar onLogout={handleLogout} />
        {/* No GlobalBackButton on dashboard, as per new logic */}
        <div style={{ position: 'relative', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', zIndex: 10, pointerEvents: 'auto', paddingTop: 100, paddingBottom: 64 }}>
          <div style={{ width: '100%', maxWidth: 700, margin: '3rem auto 0 auto', padding: '2.5rem 2rem', borderRadius: '1.25rem', background: 'rgba(24, 28, 37, 0.68)', boxShadow: '0 8px 32px rgba(30,41,59,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(99,102,241,0.16)', transition: 'background 0.3s, box-shadow 0.3s', fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Roboto', Arial, sans-serif", color: '#e0e7ef', overflowX: 'hidden' }}>
            {/* Shorter, smaller, catchy heading */}
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#e0e7ef', marginBottom: 22, textAlign: 'center', fontFamily: 'Montserrat, Poppins, Arial, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
              Your AI Cloud Workspace
            </div>
            {/* Card View for dashboard actions as 3D carousel */}
            <DashboardCarousel options={cardOptions} onCardClick={opt => opt.onClick()} />
            {/* Old dashboard upload actions removed as per user request */}
            {/* <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
              <HoverButton onClick={() => document.getElementById('file-upload-input').click()}>Upload File</HoverButton>
              <HoverButton onClick={() => setShowCloudUpload(true)}>Upload from URL</HoverButton>
              <HoverButton onClick={() => setShowCloudModal(!showCloudModal)}>Upload from Cloud</HoverButton>
            </div> */}
            {showCloudModal && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white/90 rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
                  <button onClick={() => setShowCloudModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">✕</button>
                  <h2 className="text-3xl font-bold mb-4 text-center text-[#1e2530]">Select Cloud Provider</h2>
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => handleProviderLogin("google")}>Google Drive</Button>
                    <Button onClick={() => handleProviderLogin("onedrive")}>OneDrive</Button>
                    <Button onClick={() => handleProviderLogin("box")}>Box</Button>
                    <Button onClick={() => alert('Amazon S3: Please use pre-signed URL or enter credentials.')}>Amazon S3</Button>
                  </div>
                </div>
              </div>
            )}
            {showCloudUpload && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white/90 rounded-2xl shadow-2xl p-8 max-w-md w-full relative flex flex-col items-center">
                  <button
                    onClick={() => setShowCloudUpload(false)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                  >
                    ✕
                  </button>
                  <h2 className="text-3xl font-bold mb-4 text-center text-[#1e2530]">Upload from Cloud</h2>
                  <CardGrid cards={cardOptions} />
                  <input
                    type="text"
                    value={uploadUrl}
                    onChange={e => setUploadUrl(e.target.value)}
                    placeholder="Paste file URL here (Drive, etc.)"
                    className="w-full px-3 py-2 border rounded mb-2"
                  />
                  <Button onClick={handleUploadUrl} disabled={uploading} className="w-full bg-[#232b38] text-white px-4 py-2 rounded-lg mt-2 hover:bg-[#151a23]">Upload</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
