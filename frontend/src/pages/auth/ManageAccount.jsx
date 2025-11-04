import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import saasToast from '@/utils/toast';
import api from '../../utils/api';
import ConfirmDialog from '../../components/ConfirmDialog';

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
  saasToast.success('Your account has been deleted', { idKey: 'account-deleted' });
      if (onLogout) onLogout();
      navigate('/', { replace: true });
    } catch (e) {
  saasToast.error(e.response?.data?.detail || 'Failed to delete account', { idKey: 'account-delete-error' });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto mt-[120px] mb-10 px-4">
      <h1 className="font-extrabold text-[28px] mb-2">Manage Account</h1>
      <p className="opacity-80 mb-5">View and manage your account settings. You can delete your account permanently here.</p>
      <div className="border border-slate-400/30 rounded-xl p-4 bg-slate-950/40">
        <h2 className="text-lg mb-2">Danger zone</h2>
        <p className="opacity-80 mb-3">Deleting your account will remove all your user data and log you out.</p>
        <button disabled={busy} onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white border-0 px-[14px] py-[10px] rounded-[10px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
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
