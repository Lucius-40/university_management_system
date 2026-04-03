import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { readAuthSession } from '../../utils/authStorage';
import { formatDateDisplay } from '../../utils/dateFormat';

const DEFAULT_TERM_NUMBER = 1;

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildCourseBlockReason = (course) => {
  if (course.can_enroll) return null;

  if (course.already_enrolled) {
    return 'Already enrolled in this term';
  }

  if (Array.isArray(course.missing_prerequisites) && course.missing_prerequisites.length > 0) {
    const codes = course.missing_prerequisites.map((item) => item.course_code).filter(Boolean);
    return `Missing prerequisites: ${codes.join(', ')}`;
  }

  if (course.previous_grade && ['A+', 'A', 'A-', 'B', 'C', 'D'].includes(course.previous_grade)) {
    return `Already passed before (${course.previous_grade})`;
  }

  return 'Not eligible to enroll';
};

const RegistrationSection = () => {
  const { user } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;
  const userId = sessionUser?.id;
  const initialTermNumber = parseNumber(
    sessionUser?.current_term_number ?? sessionUser?.term_number,
    DEFAULT_TERM_NUMBER
  );

  const [termNumber, setTermNumber] = useState(initialTermNumber);
  const [hasSyncedCurrentTerm, setHasSyncedCurrentTerm] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedCredits = useMemo(() => {
    const selectedSet = new Set(selectedCourseIds);
    return courses.reduce((total, course) => {
      if (!selectedSet.has(course.id)) return total;
      return total + parseNumber(course.credit_hours, 0);
    }, 0);
  }, [courses, selectedCourseIds]);

  const hasRetakeSelection = useMemo(() => {
    if (selectedCourseIds.length === 0) return false;
    const selectedSet = new Set(selectedCourseIds);
    return courses.some((course) => selectedSet.has(course.id) && Boolean(course.is_retake));
  }, [courses, selectedCourseIds]);

  const fetchCourses = async (resolvedTermNumber) => {
    if (!userId) return;

    setIsLoadingCourses(true);
    try {
      const response = await api.get(`/students/${encodeURIComponent(userId)}/available-courses`, {
        params: { term_number: resolvedTermNumber },
      });

      setCourses(Array.isArray(response.data?.courses) ? response.data.courses : []);
    } catch (error) {
      setCourses([]);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to load available courses.';
      setErrorMessage(message);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const fetchEligibility = async () => {
    if (!userId) {
      setErrorMessage('No user found in session. Please log in again.');
      return;
    }

    const resolvedTermNumber = parseNumber(termNumber, DEFAULT_TERM_NUMBER);
    if (!resolvedTermNumber || resolvedTermNumber < 1) {
      setErrorMessage('Term number must be greater than zero.');
      return;
    }

    setIsLoadingEligibility(true);
    setErrorMessage('');
    setSuccessData(null);
    setCourses([]);
    setSelectedCourseIds([]);

    try {
      const response = await api.get(
        `/students/${encodeURIComponent(userId)}/registration-eligibility`,
        {
          params: { term_number: resolvedTermNumber },
        }
      );

      const payload = response.data;
      setEligibility(payload);

      const sections = Array.isArray(payload?.sections) ? payload.sections : [];
      if (sections.length > 0) {
        const firstSection = sections[0]?.name || '';
        setSelectedSection(firstSection);
      } else {
        setSelectedSection('');
      }

      if (payload?.eligible && payload?.registration_open) {
        await fetchCourses(resolvedTermNumber);
      }
    } catch (error) {
      setEligibility(null);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to check registration eligibility.';
      setErrorMessage(message);
    } finally {
      setIsLoadingEligibility(false);
    }
  };

  useEffect(() => {
    if (!userId || hasSyncedCurrentTerm) return;

    const syncCurrentTermNumber = async () => {
      try {
        const response = await api.get(`/users/profile/student/${encodeURIComponent(userId)}`);
        const currentTermNumber = parseNumber(response.data?.profile?.term_number, 0);

        if (currentTermNumber > 0) {
          setTermNumber(currentTermNumber);
        }
      } catch (_error) {
        // Keep fallback term if profile lookup fails.
      } finally {
        setHasSyncedCurrentTerm(true);
      }
    };

    syncCurrentTermNumber();
  }, [hasSyncedCurrentTerm, userId]);

  useEffect(() => {
    if (!hasSyncedCurrentTerm) return;
    fetchEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, termNumber, hasSyncedCurrentTerm]);

  const toggleCourseSelection = (courseId) => {
    setSelectedCourseIds((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      }
      return [...prev, courseId];
    });
  };

  const handleSubmitRegistration = async () => {
    setErrorMessage('');
    setSuccessData(null);

    if (!userId) {
      setErrorMessage('No user found in session. Please log in again.');
      return;
    }

    if (hasRetakeSelection && !selectedSection) {
      setErrorMessage('Please select a section.');
      return;
    }

    if (selectedCourseIds.length === 0) {
      setErrorMessage('Please select at least one eligible course.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        term_number: parseNumber(termNumber, DEFAULT_TERM_NUMBER),
        course_offering_ids: selectedCourseIds,
      };

      if (hasRetakeSelection) {
        payload.section_name = selectedSection;
      }

      const response = await api.post(`/students/${encodeURIComponent(userId)}/register`, payload);

      setSuccessData(response.data);
      setSelectedCourseIds([]);
      await fetchEligibility();
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to submit registration.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const registrationPeriodText = eligibility?.registration_period
    ? `${formatDateDisplay(eligibility.registration_period.reg_start)} to ${formatDateDisplay(eligibility.registration_period.reg_end)}`
    : 'Not configured';

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Course Registration</h1>
            <p className="text-slate-600 mt-1">
              Check registration window, select eligible courses, and submit for advisor approval.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchEligibility}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={isLoadingEligibility || isLoadingCourses || isSubmitting}
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm space-y-1 max-w-xs">
            <span className="text-slate-700">Term Number</span>
            <input
              type="number"
              min="1"
              value={termNumber}
              onChange={(event) => setTermNumber(parseNumber(event.target.value, DEFAULT_TERM_NUMBER))}
              className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>

          <div className="text-sm text-slate-700">
            <p className="font-medium">Registration Period</p>
            <p>{registrationPeriodText}</p>
          </div>

          <div className="text-sm text-slate-700">
            <p className="font-medium">Current Status</p>
            <p>{eligibility?.registration_open ? 'Open' : 'Closed'}</p>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {errorMessage}
          </div>
        ) : null}

        {successData ? (
          <div className="rounded border border-green-300 bg-green-50 text-green-800 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">
              {successData?.message || 'Registration submitted. Pending advisor approval.'}
            </p>
            {successData?.advisor ? (
              <p>
                Advisor: {successData.advisor.name} ({successData.advisor.email})
              </p>
            ) : (
              <p>Advisor info unavailable. Please contact your department office.</p>
            )}
          </div>
        ) : null}

        {isLoadingEligibility ? <p className="text-slate-600">Checking registration eligibility...</p> : null}
      </div>

      {!isLoadingEligibility && eligibility && !eligibility.registration_open ? (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-6 text-amber-900">
          <h2 className="text-xl font-semibold">The registration window is over</h2>
          <p className="mt-2 text-sm">Registration period: {registrationPeriodText}</p>
        </div>
      ) : null}

      {!isLoadingEligibility && eligibility && eligibility.registration_open && !eligibility.eligible ? (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-6 space-y-2 text-orange-900">
          <h2 className="text-xl font-semibold">
            {eligibility.previous_term_requirement_met === false
              ? 'Not eligible for this term'
              : 'You are not eligible for registration yet'}
          </h2>
          <p className="text-sm">Please resolve the following blockers:</p>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {!eligibility.student_active ? <li>Student status is not Active.</li> : null}
            {!eligibility.department ? <li>No department assigned.</li> : null}
            {!eligibility.term ? <li>No matching term found for this term number.</li> : null}
            {eligibility.previous_term_requirement_met === false ? (
              <li>
                Not eligible for this term. You need at least one archived course in term{' '}
                {eligibility.required_previous_term_number ?? '-'}.
              </li>
            ) : null}
            {eligibility.has_overdue_dues ? <li>There are unpaid required dues.</li> : null}
          </ul>
        </div>
      ) : null}

      {!isLoadingEligibility && eligibility?.eligible ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Eligible Courses</h2>
              <p className="text-slate-600 text-sm mt-1">
                Select your courses and submit them for advisor approval.
              </p>
            </div>
            <div className="text-sm text-slate-700">
              <p>
                Credits selected: <span className="font-semibold">{selectedCredits.toFixed(1)}</span>
              </p>
              <p>
                Remaining before submit:{' '}
                <span className="font-semibold">
                  {parseNumber(eligibility.credits?.remaining, 0).toFixed(1)}
                </span>{' '}
                / {parseNumber(eligibility.credits?.limit, 0).toFixed(1)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {hasRetakeSelection ? (
              <label className="text-sm space-y-1 max-w-xs">
                <span className="text-slate-700">Section (required for retakes)</span>
                <select
                  value={selectedSection}
                  onChange={(event) => setSelectedSection(event.target.value)}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {!selectedSection ? <option value="">Select section</option> : null}
                  {(eligibility.sections || []).map((section) => {
                    const sectionName = section?.name || '';
                    return (
                      <option key={sectionName} value={sectionName}>
                        {sectionName}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : (
              <div className="text-sm text-slate-700">
                <p className="font-medium">Section</p>
                <p>Auto-selected from your assigned section for non-retake registration.</p>
              </div>
            )}

            <div className="text-sm text-slate-700">
              <p className="font-medium">Advisor</p>
              {eligibility.advisor ? (
                <p>
                  {eligibility.advisor.name} ({eligibility.advisor.email})
                </p>
              ) : (
                <p>No advisor assigned yet.</p>
              )}
            </div>
          </div>

          {isLoadingCourses ? <p className="text-slate-600">Loading available courses...</p> : null}

          {!isLoadingCourses ? (
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-800">
                  <tr>
                    <th className="text-left p-3">Select</th>
                    <th className="text-left p-3">Course</th>
                    <th className="text-left p-3">Credits</th>
                    <th className="text-left p-3">Capacity</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => {
                    const reason = buildCourseBlockReason(course);
                    const isChecked = selectedCourseIds.includes(course.id);
                    const capacity =
                      course.max_capacity != null
                        ? `${course.enrollment_count}/${course.max_capacity}`
                        : `${course.enrollment_count}/Unlimited`;

                    return (
                      <tr key={course.id} className="border-t border-slate-200 align-top">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!course.can_enroll || isSubmitting}
                            onChange={() => toggleCourseSelection(course.id)}
                          />
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-slate-900">
                            {course.course_code} - {course.name}
                          </p>
                          {course.previous_grade ? (
                            <p className="text-xs text-slate-600 mt-1">
                              Previous grade: {course.previous_grade}
                            </p>
                          ) : null}
                        </td>
                        <td className="p-3 text-slate-700">{parseNumber(course.credit_hours, 0)}</td>
                        <td className="p-3 text-slate-700">{capacity}</td>
                        <td className="p-3">
                          {course.can_enroll ? (
                            <span className="inline-block rounded bg-green-100 text-green-700 px-2 py-1 text-xs">
                              Selectable
                            </span>
                          ) : (
                            <span className="inline-block rounded bg-slate-200 text-slate-700 px-2 py-1 text-xs">
                              {reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {courses.length === 0 ? (
                    <tr>
                      <td className="p-4 text-slate-600" colSpan={5}>
                        No course offerings found for this term.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmitRegistration}
              disabled={isSubmitting || selectedCourseIds.length === 0 || (hasRetakeSelection && !selectedSection)}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Advisor Approval'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default RegistrationSection;
