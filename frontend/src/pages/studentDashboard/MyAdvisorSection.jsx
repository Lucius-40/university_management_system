import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { readAuthSession } from '../../utils/authStorage';

const readAdvisorValue = (advisor, keys) => {
  for (const key of keys) {
    const value = advisor?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value);
    }
  }
  return '-';
};

const MyAdvisorSection = () => {
  const { user } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;
  const userId = sessionUser?.id;

  const [advisor, setAdvisor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAdvisor = async () => {
    if (!userId) {
      setErrorMessage('No user found in session. Please log in again.');
      setAdvisor(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.get(`/students/${encodeURIComponent(userId)}/advisors/current`);
      setAdvisor(response.data?.current_advisor || null);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to load advisor information.';
      setErrorMessage(message);
      setAdvisor(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <section className="max-w-5xl space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My Advisor</h1>
            <p className="text-slate-600 mt-1">Your currently assigned academic advisor details.</p>
          </div>
          <button
            type="button"
            onClick={loadAdvisor}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? <p className="text-slate-600">Loading advisor information...</p> : null}

        {!isLoading && !errorMessage && !advisor ? (
          <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
            No advisor is assigned yet.
          </div>
        ) : null}

        {!isLoading && advisor ? (
          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-blue-900">Advisor Assigned</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
              <div className="rounded border border-blue-100 bg-white p-3">
                <p className="text-slate-500">Name</p>
                <p className="font-medium text-slate-900 mt-1">
                  {readAdvisorValue(advisor, ['advisor_name', 'name'])}
                </p>
              </div>
              <div className="rounded border border-blue-100 bg-white p-3">
                <p className="text-slate-500">Contact (Email)</p>
                <p className="font-medium text-slate-900 mt-1">
                  {readAdvisorValue(advisor, ['advisor_email', 'email'])}
                </p>
              </div>
              <div className="rounded border border-blue-100 bg-white p-3">
                <p className="text-slate-500">Appointment</p>
                <p className="font-medium text-slate-900 mt-1">
                  {readAdvisorValue(advisor, ['appointment'])}
                </p>
              </div>
              <div className="rounded border border-blue-100 bg-white p-3">
                <p className="text-slate-500">Advisor ID</p>
                <p className="font-medium text-slate-900 mt-1">
                  {readAdvisorValue(advisor, ['teacher_id', 'advisor_id'])}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default MyAdvisorSection;
