import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ManageAccount({ onLogout }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const handleDelete = () => setConfirmOpen(true);
  const doDelete = async () => {
    try {
      setBusy(true);
      await api.delete('/auth/account');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('access_token');
      toast.success('Your account has been deleted');
      if (onLogout) onLogout();
      navigate('/', { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete account');
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div style={{maxWidth:720,margin:'120px auto 40px',padding:'0 16px'}}>
      <h1 style={{fontWeight:800,fontSize:28,marginBottom:8}}>Manage Account</h1>
      <p style={{opacity:0.8,marginBottom:22}}>View and manage your account settings. You can delete your account permanently here.</p>
      <div style={{border:'1px solid rgba(148,163,184,0.3)',borderRadius:12,padding:16,background:'rgba(2,6,23,0.4)'}}>
        <h2 style={{fontSize:18,marginBottom:8}}>Danger zone</h2>
        <p style={{opacity:0.8,marginBottom:12}}>Deleting your account will remove all your user data and log you out.</p>
        <button disabled={busy} onClick={handleDelete} style={{background:'#ef4444',color:'#fff',border:'none',padding:'10px 14px',borderRadius:10,fontWeight:700,cursor:'pointer'}}>
          {busy ? 'Deleting…' : 'Delete Account'}
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete account"
        message="Are you sure you want to delete your account? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doDelete}
      />
    </div>
  );
}
