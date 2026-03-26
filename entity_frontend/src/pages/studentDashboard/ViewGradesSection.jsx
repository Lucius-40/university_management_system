import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { readAuthSession } from '../../utils/authStorage';
import { formatDateDisplay } from '../../utils/dateFormat';

const ViewGradesSection = () => {
  const { user } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;
  const userId = sessionUser?.id;

  const [termGroups, setTermGroups] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadResults = async () => {
    if (!userId) {
      setErrorMessage('No user found in session. Please log in again.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.get(`/students/${encodeURIComponent(userId)}/results`);
      const terms = Array.isArray(response.data?.terms) ? response.data.terms : [];
      setTermGroups(terms);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to load term results.';
      setErrorMessage(message);
      setTermGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const filteredGroups = useMemo(() => {
    if (selectedTermId === 'all') return termGroups;
    return termGroups.filter((group) => String(group?.term?.id) === String(selectedTermId));
  }, [termGroups, selectedTermId]);

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">View Grades</h1>
            <p className="text-slate-600 mt-1">Your published results across completed and archived terms.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedTermId('all');
              loadResults();
            }}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        <label className="text-sm space-y-1 max-w-xs block">
          <span className="text-slate-700">Term Filter</span>
          <select
            value={selectedTermId}
            onChange={(event) => setSelectedTermId(event.target.value)}
            className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Terms</option>
            {termGroups.map((group) => (
              <option key={group.term.id} value={group.term.id}>
                Term {group.term.term_number}
              </option>
            ))}
          </select>
        </label>

        {errorMessage ? (
          <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? <p className="text-slate-600">Loading results...</p> : null}
      </div>

      {!isLoading && !errorMessage && filteredGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-slate-700">
          No published results found yet.
        </div>
      ) : null}

      {!isLoading && filteredGroups.length > 0
        ? filteredGroups.map((group) => (
            <div key={group.term.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Term {group.term.term_number}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {formatDateDisplay(group.term.start_date)} to {formatDateDisplay(group.term.end_date)}
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-800">
                    <tr>
                      <th className="text-left p-3">Course Code</th>
                      <th className="text-left p-3">Course Name</th>
                      <th className="text-left p-3">CT (Best 3)</th>
                      <th className="text-left p-3">Attendance</th>
                      <th className="text-left p-3">Final</th>
                      <th className="text-left p-3">Total</th>
                      <th className="text-left p-3">Percentage</th>
                      <th className="text-left p-3">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.results || []).map((row) => (
                      <tr key={row.enrollment_id} className="border-t border-slate-200">
                        <td className="p-3 font-medium text-slate-900">{row.course_code}</td>
                        <td className="p-3 text-slate-700">{row.course_name}</td>
                        <td className="p-3 text-slate-700">{row.ct_best3_score}</td>
                        <td className="p-3 text-slate-700">{row.attendance_score}</td>
                        <td className="p-3 text-slate-700">{row.final_score}</td>
                        <td className="p-3 text-slate-700">{row.total_score}</td>
                        <td className="p-3 text-slate-700">{row.percentage}%</td>
                        <td className="p-3">
                          <span className="inline-block rounded bg-blue-100 text-blue-800 px-2 py-1 text-xs font-semibold">
                            {row.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(group.results || []).length === 0 ? (
                      <tr>
                        <td className="p-4 text-slate-600" colSpan={8}>
                          No published grades available for this term.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        : null}
    </section>
  );
};

export default ViewGradesSection;
