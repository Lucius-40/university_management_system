import { useEffect, useState } from 'react';
import api from '../../services/api';

const InitialExamRoutineSection = () => {
  const [routineUrl, setRoutineUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRoutine = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.get('/routines/current');
      setRoutineUrl(response.data?.routine?.file_url || '');
    } catch (error) {
      setRoutineUrl('');
      setErrorMessage(error.response?.data?.error || 'Failed to load routine.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoutine();
  }, []);

  return (
    <section className="max-w-5xl space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Initial Exam Routine</h1>
            <p className="text-slate-600 mt-1">View your currently published routine PDF.</p>
          </div>
          <button
            type="button"
            onClick={loadRoutine}
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

        {isLoading ? <p className="text-slate-600">Loading routine...</p> : null}

        {!isLoading && !errorMessage && !routineUrl ? (
          <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
            Routine has not been uploaded yet.
          </div>
        ) : null}

        {!isLoading && routineUrl ? (
          <div className="space-y-3">
            <a
              href={routineUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-blue-700 hover:underline"
            >
              Open in new tab
            </a>
            <iframe
              src={routineUrl}
              title="Initial Exam Routine PDF"
              className="w-full h-[70vh] border rounded"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default InitialExamRoutineSection;
