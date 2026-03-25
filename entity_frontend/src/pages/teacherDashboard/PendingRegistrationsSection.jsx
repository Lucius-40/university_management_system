import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { formatDateDisplay } from '../../utils/dateFormat';

const PendingRegistrationsSection = () => {
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState({ total_students: 0, total_enrollments: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [processingStudentId, setProcessingStudentId] = useState(null);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((left, right) => {
      const leftRoll = String(left?.student?.roll_number || '');
      const rightRoll = String(right?.student?.roll_number || '');
      return leftRoll.localeCompare(rightRoll);
    });
  }, [groups]);

  const fetchPendingRegistrations = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/teachers/pending-registrations');
      const payload = response.data || {};
      setGroups(Array.isArray(payload.pending_registrations) ? payload.pending_registrations : []);
      setSummary({
        total_students: Number(payload.total_students || 0),
        total_enrollments: Number(payload.total_enrollments || 0),
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          'Failed to load pending registrations.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const handleDecision = async (enrollmentId, decision) => {
    setProcessingId(enrollmentId);
    setFeedback('');
    setError('');

    try {
      await api.put(`/teachers/enrollments/${encodeURIComponent(enrollmentId)}/decision`, {
        decision,
      });

      setGroups((previousGroups) => {
        const nextGroups = previousGroups
          .map((group) => ({
            ...group,
            enrollments: (group.enrollments || []).filter(
              (enrollment) => Number(enrollment.enrollment_id) !== Number(enrollmentId)
            ),
          }))
          .filter((group) => (group.enrollments || []).length > 0)
          .map((group) => ({
            ...group,
            total_enrollments: group.enrollments.length,
          }));

        const totalEnrollments = nextGroups.reduce(
          (count, group) => count + Number(group.total_enrollments || 0),
          0
        );

        setSummary({
          total_students: nextGroups.length,
          total_enrollments: totalEnrollments,
        });

        return nextGroups;
      });

      setFeedback(
        decision === 'approve' ? 'Registration approved successfully.' : 'Registration denied successfully.'
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          'Failed to submit decision.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAllForStudent = async (studentId) => {
    if (!studentId) return;

    setProcessingStudentId(studentId);
    setFeedback('');
    setError('');

    try {
      const response = await api.put(
        `/teachers/students/${encodeURIComponent(studentId)}/approve-all-pending`
      );

      const approvedCount = Number(response.data?.approved_count || 0);

      setGroups((previousGroups) => {
        const nextGroups = previousGroups.filter(
          (group) => Number(group?.student?.id) !== Number(studentId)
        );

        const totalEnrollments = nextGroups.reduce(
          (count, group) => count + Number(group.total_enrollments || 0),
          0
        );

        setSummary({
          total_students: nextGroups.length,
          total_enrollments: totalEnrollments,
        });

        return nextGroups;
      });

      setFeedback(
        approvedCount > 0
          ? `Approved ${approvedCount} pending request${approvedCount === 1 ? '' : 's'} for the student.`
          : 'All pending registrations approved successfully.'
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          'Failed to approve all pending registrations for this student.'
      );
    } finally {
      setProcessingStudentId(null);
    }
  };

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Pending Registrations</h1>
            <p className="text-slate-600 mt-1">
              Review registration requests from your advisees and approve or deny each course request.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPendingRegistrations}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={isLoading || processingId !== null || processingStudentId !== null}
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-slate-200 p-3 bg-slate-50">
            <p className="text-sm text-slate-600">Students with pending requests</p>
            <p className="text-2xl font-semibold text-slate-900">{summary.total_students}</p>
          </div>
          <div className="rounded border border-slate-200 p-3 bg-slate-50">
            <p className="text-sm text-slate-600">Total pending enrollments</p>
            <p className="text-2xl font-semibold text-slate-900">{summary.total_enrollments}</p>
          </div>
        </div>

        {feedback ? (
          <div className="rounded border border-green-300 bg-green-50 text-green-800 px-4 py-3 text-sm">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="rounded border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <p className="text-slate-600">Loading pending registrations...</p>
        </div>
      ) : null}

      {!isLoading && sortedGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No pending registrations</h2>
          <p className="text-slate-600 mt-2">
            You currently have no advisee registration requests waiting for approval.
          </p>
        </div>
      ) : null}

      {!isLoading && sortedGroups.length > 0
        ? sortedGroups.map((group) => (
            <article
              key={group.student?.id}
              className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
            >
              <header className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{group.student?.name}</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Roll: {group.student?.roll_number || '-'} | Email: {group.student?.email || '-'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApproveAllForStudent(group.student?.id)}
                    disabled={
                      !group.student?.id ||
                      processingStudentId === group.student?.id ||
                      processingId !== null
                    }
                    className="px-3 py-1 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-60"
                  >
                    {processingStudentId === group.student?.id ? 'Approving...' : 'Approve All'}
                  </button>
                </div>
              </header>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-800">
                    <tr>
                      <th className="text-left p-3">Course</th>
                      <th className="text-left p-3">Term</th>
                      <th className="text-left p-3">Requested At</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.enrollments || []).map((enrollment) => (
                      <tr key={enrollment.enrollment_id} className="border-t border-slate-200 align-top">
                        <td className="p-3">
                          <p className="font-medium text-slate-900">
                            {enrollment.course?.code} - {enrollment.course?.name}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Credits: {enrollment.course?.credit_hours ?? enrollment.credit_when_taking ?? '-'}
                          </p>
                        </td>
                        <td className="p-3 text-slate-700">
                          <p>Term {enrollment.term?.term_number}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {enrollment.term?.department?.code || enrollment.term?.department?.name || '-'}
                          </p>
                        </td>
                        <td className="p-3 text-slate-700">
                          {formatDateDisplay(enrollment.requested_at, '-')}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleDecision(enrollment.enrollment_id, 'approve')}
                              disabled={processingId === enrollment.enrollment_id}
                              className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                            >
                              {processingId === enrollment.enrollment_id ? 'Saving...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecision(enrollment.enrollment_id, 'deny')}
                              disabled={processingId === enrollment.enrollment_id}
                              className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {processingId === enrollment.enrollment_id ? 'Saving...' : 'Deny'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))
        : null}
    </section>
  );
};

export default PendingRegistrationsSection;
