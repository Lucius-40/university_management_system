import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { formatDateDisplay } from '../../utils/dateFormat';

const StatCard = ({ label, value }) => (
  <div className="rounded border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const TeacherResourceOverviewSection = () => {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/teachers/me/resource-overview');
      setOverview(response.data || null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.response?.data?.message ||
          'Failed to load teacher overview.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const sortedAdvisees = useMemo(() => {
    if (!Array.isArray(overview?.advisor?.advisees)) {
      return [];
    }

    return [...overview.advisor.advisees].sort((left, right) => {
      const leftRoll = String(left?.roll_number || '');
      const rightRoll = String(right?.roll_number || '');
      return leftRoll.localeCompare(rightRoll);
    });
  }, [overview]);

  const groupedSectionsByTerm = useMemo(() => {
    const rows = Array.isArray(overview?.teaching?.sections) ? overview.teaching.sections : [];
    const grouped = new Map();

    for (const row of rows) {
      const key = String(row.term_number ?? 'N/A');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(row);
    }

    return Array.from(grouped.entries())
      .map(([termNumber, entries]) => ({
        term_number: termNumber,
        entries,
      }))
      .sort((left, right) => Number(right.term_number) - Number(left.term_number));
  }, [overview]);

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Teacher Resource Hub</h1>
            <p className="mt-1 text-slate-600">
              Advisor data, teaching assignments, and department insights in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchOverview}
            disabled={isLoading}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <p className="text-slate-600">Loading resource overview...</p>
        </div>
      ) : null}

      {!isLoading && overview ? (
        <>
          <article className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">My Information</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm space-y-1">
                <p><span className="font-semibold">Name:</span> {overview.teacher?.name || '-'}</p>
                <p><span className="font-semibold">Personal Email:</span> {overview.teacher?.email || '-'}</p>
                <p><span className="font-semibold">Official Email:</span> {overview.teacher?.official_mail || '-'}</p>
                <p><span className="font-semibold">Mobile:</span> {overview.teacher?.mobile_number || '-'}</p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm space-y-1">
                <p><span className="font-semibold">Appointment:</span> {overview.teacher?.appointment || '-'}</p>
                <p>
                  <span className="font-semibold">Department:</span>{' '}
                  {overview.teacher?.department_code
                    ? `${overview.teacher.department_code} - ${overview.teacher?.department_name || ''}`
                    : overview.teacher?.department_name || '-'}
                </p>
                <p>
                  <span className="font-semibold">Department Head:</span>{' '}
                  {overview.teacher?.is_active_department_head ? 'Yes' : 'No'}
                </p>
                <p>
                  <span className="font-semibold">Head Since:</span>{' '}
                  {formatDateDisplay(overview.teacher?.department_head_start_date, 'N/A')}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Advisees" value={Number(overview.own_stats?.advisee_count || 0)} />
              <StatCard
                label="Pending Approvals"
                value={Number(overview.own_stats?.pending_enrollments_total || 0)}
              />
              <StatCard
                label="Courses Offered"
                value={Number(overview.own_stats?.courses_offered_count || 0)}
              />
              <StatCard
                label="Active Offerings"
                value={Number(overview.own_stats?.active_course_offering_count || 0)}
              />
              <StatCard
                label="Sections Teaching"
                value={Number(overview.own_stats?.sections_teaching_count || 0)}
              />
              <StatCard
                label="Advisees With Pending"
                value={Number(overview.own_stats?.advisees_with_pending_count || 0)}
              />
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <header className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-semibold text-slate-900">Advisor Insights</h2>
              <p className="text-sm text-slate-600 mt-1">
                Full active advisee roster with current pending registration load.
              </p>
            </header>

            {sortedAdvisees.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">No active advisees assigned right now.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-800">
                    <tr>
                      <th className="p-3 text-left">Roll</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Current Term</th>
                      <th className="p-3 text-left">Pending</th>
                      <th className="p-3 text-left">Advisor Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAdvisees.map((row) => (
                      <tr key={row.student_id} className="border-t border-slate-200">
                        <td className="p-3">{row.roll_number || '-'}</td>
                        <td className="p-3">
                          <p className="font-medium text-slate-900">{row.student_name || '-'}</p>
                          <p className="text-xs text-slate-600">{row.student_email || '-'}</p>
                        </td>
                        <td className="p-3">
                          {row.current_term?.term_number ? `Term ${row.current_term.term_number}` : 'N/A'}
                        </td>
                        <td className="p-3">{Number(row.pending_enrollments_count || 0)}</td>
                        <td className="p-3">{formatDateDisplay(row.advisor_since, 'N/A')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <header className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-semibold text-slate-900">Teaching Load</h2>
              <p className="text-sm text-slate-600 mt-1">
                Courses offered and sections currently assigned to you.
              </p>
            </header>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-3">Course Offerings</h3>
                {Array.isArray(overview.teaching?.courses_offered) && overview.teaching.courses_offered.length > 0 ? (
                  <div className="overflow-x-auto rounded border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 text-slate-800">
                        <tr>
                          <th className="p-3 text-left">Course</th>
                          <th className="p-3 text-left">Credit</th>
                          <th className="p-3 text-left">Offerings</th>
                          <th className="p-3 text-left">Sections</th>
                          <th className="p-3 text-left">Terms</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.teaching.courses_offered.map((course) => (
                          <tr key={course.course_id} className="border-t border-slate-200">
                            <td className="p-3">
                              <p className="font-medium text-slate-900">{course.course_code} - {course.course_name}</p>
                            </td>
                            <td className="p-3">{course.credit_hours ?? '-'}</td>
                            <td className="p-3">{Number(course.offering_count || 0)}</td>
                            <td className="p-3">{Number(course.section_count || 0)}</td>
                            <td className="p-3">{Array.isArray(course.terms) ? course.terms.join(', ') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No active course offerings found.</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-3">Sections By Term</h3>
                {groupedSectionsByTerm.length === 0 ? (
                  <p className="text-sm text-slate-600">No active sections found.</p>
                ) : (
                  <div className="space-y-4">
                    {groupedSectionsByTerm.map((group) => (
                      <div key={`term-${group.term_number}`} className="rounded border border-slate-200">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">
                          Term {group.term_number}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-white text-slate-700">
                              <tr>
                                <th className="p-3 text-left">Course</th>
                                <th className="p-3 text-left">Section</th>
                                <th className="p-3 text-left">Department</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.entries.map((entry, index) => (
                                <tr
                                  key={`${entry.course_offering_id}-${entry.section_name}-${index}`}
                                  className="border-t border-slate-200"
                                >
                                  <td className="p-3">{entry.course?.code} - {entry.course?.name}</td>
                                  <td className="p-3">{entry.section_name}</td>
                                  <td className="p-3">{entry.department_code || entry.department_name || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <header className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-semibold text-slate-900">Department Head Insights</h2>
              <p className="text-sm text-slate-600 mt-1">
                Department-level data is visible only when you are the active department head.
              </p>
            </header>

            {!overview.department_head?.is_active_department_head ? (
              <div className="p-6 text-sm text-slate-600">
                You are not currently assigned as the active department head.
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard label="Teachers" value={Number(overview.department_head?.overview?.teacher_count || 0)} />
                  <StatCard label="Students" value={Number(overview.department_head?.overview?.student_count || 0)} />
                  <StatCard label="Courses" value={Number(overview.department_head?.overview?.course_count || 0)} />
                  <StatCard label="Terms" value={Number(overview.department_head?.overview?.term_count || 0)} />
                  <StatCard label="Active Offerings" value={Number(overview.department_head?.overview?.active_offering_count || 0)} />
                  <StatCard label="Active Sections" value={Number(overview.department_head?.overview?.active_section_count || 0)} />
                </div>

                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <p>
                    <span className="font-semibold">Current Department Head:</span>{' '}
                    {overview.department_head?.overview?.current_head_name || 'N/A'}
                  </p>
                  <p>
                    <span className="font-semibold">Email:</span>{' '}
                    {overview.department_head?.overview?.current_head_email || 'N/A'}
                  </p>
                  <p>
                    <span className="font-semibold">Started:</span>{' '}
                    {formatDateDisplay(overview.department_head?.overview?.current_head_start_date, 'N/A')}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-3">Faculty Snapshot</h3>
                  {Array.isArray(overview.department_head?.faculty) && overview.department_head.faculty.length > 0 ? (
                    <div className="overflow-x-auto rounded border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 text-slate-800">
                          <tr>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Appointment</th>
                            <th className="p-3 text-left">Active Sections</th>
                            <th className="p-3 text-left">Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.department_head.faculty.map((faculty) => (
                            <tr key={faculty.user_id} className="border-t border-slate-200">
                              <td className="p-3">
                                <p className="font-medium text-slate-900">{faculty.name}</p>
                                <p className="text-xs text-slate-600">{faculty.email || '-'}</p>
                              </td>
                              <td className="p-3">{faculty.appointment || '-'}</td>
                              <td className="p-3">{Number(faculty.active_section_count || 0)}</td>
                              <td className="p-3">
                                {faculty.is_current_department_head ? 'Department Head' : 'Faculty'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No faculty snapshot data available.</p>
                  )}
                </div>
              </div>
            )}
          </article>
        </>
      ) : null}
    </section>
  );
};

export default TeacherResourceOverviewSection;
