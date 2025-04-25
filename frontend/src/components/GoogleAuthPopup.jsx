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
      if (!event.data) return;
      // Accept both legacy and new google_creds format
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
      } else if (event.data.error) {
        onError && onError(event.data.detail || event.data.error);
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
        borderRadius: 6,
        fontWeight: 500,
        fontSize: 16,
        cursor: "pointer",
        padding: "10px 0"
      }}
      onClick={handleGoogleLogin}
    >
      <img src="/google.svg" alt="Google" width={24} height={24} />
      Continue with Google
    </button>
  );
}
