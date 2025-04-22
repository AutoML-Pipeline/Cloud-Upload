import React from "react";

export default function GoogleAuthPopup({ onSuccess, onError, backendUrl, askForConsent }) {
  const handleGoogleLogin = () => {
    // Open backend Google login in a popup
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    // Use prompt=consent if askForConsent is true, else prompt=select_account
    const prompt = askForConsent ? 'consent' : 'select_account';
    const popup = window.open(
      `${backendUrl}/auth/google/login?prompt=${prompt}`,
      "GoogleLoginPopup",
      `width=${width},height=${height},left=${left},top=${top}`
    );
    if (!popup) return onError && onError("Popup blocked");
    // Listen for message from popup
    const listener = (event) => {
      // Accept both legacy and new google_creds format
      if (!event.data) return;
      let accessToken = event.data.access_token;
      let userObj = event.data;
      if (event.data.google_creds) {
        accessToken = event.data.google_creds.access_token;
        userObj = event.data.google_creds;
      }
      if (accessToken) {
        // Save user info for dashboard
        localStorage.setItem("google_access_token", accessToken);
        localStorage.setItem("user", JSON.stringify(userObj));
        onSuccess && onSuccess(userObj);
        window.removeEventListener("message", listener);
        try { popup.close(); } catch (e) {}
      }
    };
    window.addEventListener("message", listener);
  };

  return (
    <button
      type="button"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "#fff",
        color: "#222",
        border: "1px solid #e5e7eb",
        fontWeight: 600,
        fontSize: 16,
        padding: "0.7rem 1.2rem",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(60,60,60,0.07)",
        cursor: "pointer",
        transition: "background 0.2s, box-shadow 0.2s",
      }}
      onClick={handleGoogleLogin}
      onMouseOver={e => {
        e.currentTarget.style.background = "#f3f4f6";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(60,60,60,0.12)";
      }}
      onMouseOut={e => {
        e.currentTarget.style.background = "#fff";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(60,60,60,0.07)";
      }}
    >
      <svg width="22" height="22" viewBox="0 0 48 48" style={{marginRight:8}} xmlns="http://www.w3.org/2000/svg"><g><path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.7 33.3 30.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2.9 7.2 2.4l6.4-6.4C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.5 20-21 0-1.3-.1-2.1-.3-3z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c2.7 0 5.2.9 7.2 2.4l6.4-6.4C34.5 5.1 29.5 3 24 3c-7.7 0-14.2 4.4-17.7 10.7z"/><path fill="#FBBC05" d="M24 45c5.8 0 11-1.9 15.1-5.2l-7-5.8C29.9 35.9 27.1 37 24 37c-6.1 0-11.3-4.1-13.2-9.8l-7 5.4C7.8 41.2 15.3 45 24 45z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-1.6 4.1-5.5 7-11.7 7-3.4 0-6.5-1.1-8.6-3l-7 5.4C9.4 43.6 16.2 47 24 47c10.5 0 20-7.5 20-21 0-1.3-.1-2.1-.3-3z"/></g></svg>
      Sign in with Google
    </button>
  );
}
