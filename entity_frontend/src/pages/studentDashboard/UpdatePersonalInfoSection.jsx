import { useMemo, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { readAuthSession } from '../../utils/authStorage';

const PASSWORD_TAB = 'password-reset';

const UpdatePersonalInfoSection = () => {
  const { user } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;
  const userId = sessionUser?.id;

  const [activeTab, setActiveTab] = useState(PASSWORD_TAB);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!userId) {
      setMessage({ type: 'error', text: 'No user id found in session. Please login again.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.put(`/users/${encodeURIComponent(userId)}/reset-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setMessage({
        type: 'success',
        text: response.data?.message || 'Password reset successfully.',
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const errorText =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to reset password.';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="max-w-5xl">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reset Password</h1>
          <p className="mt-2 text-slate-600">Update your account password.</p>
        </div>

        <div className="border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab(PASSWORD_TAB);
              setMessage({ type: '', text: '' });
            }}
            className={`px-4 py-2 text-sm rounded-t ${
              activeTab === PASSWORD_TAB
                ? 'bg-slate-100 text-slate-900 border border-slate-200 border-b-white'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Password Reset
          </button>
        </div>

        {activeTab === PASSWORD_TAB ? (
          <div className="space-y-4">
            {message.text ? (
              <div
                className={`rounded border px-3 py-2 text-sm ${
                  message.type === 'success'
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-red-300 bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <form onSubmit={handleResetPassword} className="grid gap-4 md:grid-cols-2">
              <label className="text-sm space-y-1 md:col-span-2">
                <span className="text-slate-700">Current Password</span>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </label>

              <label className="text-sm space-y-1">
                <span className="text-slate-700">New Password</span>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </label>

              <label className="text-sm space-y-1">
                <span className="text-slate-700">Confirm New Password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSaving ? 'Updating...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default UpdatePersonalInfoSection;
