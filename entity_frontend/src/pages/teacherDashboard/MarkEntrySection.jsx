import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const MARK_TYPES = ['CT', 'Midterm', 'Attendance', 'Final'];

const MarkEntrySection = () => {
  const [contexts, setContexts] = useState([]);
  const [selectedContextKey, setSelectedContextKey] = useState('');
  const [workspace, setWorkspace] = useState(null);
  const [isLoadingContexts, setIsLoadingContexts] = useState(true);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [markType, setMarkType] = useState('CT');
  const [totalMarks, setTotalMarks] = useState('20');
  const [status, setStatus] = useState('Published');
  const [marksByEnrollmentId, setMarksByEnrollmentId] = useState({});

  const selectedContext = useMemo(() => {
    if (!selectedContextKey) return null;
    return contexts.find((ctx) => `${ctx.course_offering_id}::${ctx.section_name}` === selectedContextKey) || null;
  }, [contexts, selectedContextKey]);

  const defaultTotalByType = useMemo(
    () => ({
      CT: 20,
      Midterm: 50,
      Attendance: 30,
      Final: 210,
    }),
    []
  );

  const loadContexts = async () => {
    setIsLoadingContexts(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.get('/markings/teacher/contexts');
      const rows = Array.isArray(response.data) ? response.data : [];
      setContexts(rows);
      if (rows.length > 0) {
        setSelectedContextKey(`${rows[0].course_offering_id}::${rows[0].section_name}`);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to load your teaching contexts.',
      });
    } finally {
      setIsLoadingContexts(false);
    }
  };

  useEffect(() => {
    loadContexts();
  }, []);

  useEffect(() => {
    if (!selectedContext) {
      setWorkspace(null);
      return;
    }

    const loadWorkspace = async () => {
      setIsLoadingWorkspace(true);
      setMessage((prev) => (prev.type === 'error' ? { type: '', text: '' } : prev));

      try {
        const response = await api.get('/markings/teacher/workspace', {
          params: {
            course_offering_id: selectedContext.course_offering_id,
            section_name: selectedContext.section_name,
          },
        });

        const data = response.data || null;
        setWorkspace(data);

        const initialMarks = {};
        for (const student of data?.students || []) {
          initialMarks[student.enrollment_id] = '';
        }
        setMarksByEnrollmentId(initialMarks);
      } catch (error) {
        setWorkspace(null);
        setMessage({
          type: 'error',
          text: error.response?.data?.error || 'Failed to load marking workspace.',
        });
      } finally {
        setIsLoadingWorkspace(false);
      }
    };

    loadWorkspace();
  }, [selectedContext]);

  useEffect(() => {
    setTotalMarks(String(defaultTotalByType[markType] || 20));
  }, [markType, defaultTotalByType]);

  const setMarkValue = (enrollmentId, value) => {
    setMarksByEnrollmentId((prev) => ({
      ...prev,
      [enrollmentId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedContext || !workspace) return;

    const rows = Object.entries(marksByEnrollmentId)
      .map(([enrollmentId, marks]) => ({
        enrollment_id: Number(enrollmentId),
        marks_obtained: String(marks).trim(),
      }))
      .filter((row) => row.marks_obtained !== '');

    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'Please enter marks for at least one student.' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/markings/teacher/manual', {
        course_offering_id: selectedContext.course_offering_id,
        section_name: selectedContext.section_name,
        mark_type: markType,
        total_marks: Number(totalMarks),
        status,
        rows,
      });

      const data = response.data || {};
      setMessage({
        type: data.failed_count > 0 ? 'error' : 'success',
        text: `Saved. Inserted: ${data.inserted_count || 0}, Updated: ${data.updated_count || 0}, Failed: ${data.failed_count || 0}.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to submit marks.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Mark Entry</h1>
        <p className="text-slate-600">
          Enter marks for students in your assigned course section.
        </p>

        {message.text ? (
          <div
            className={`rounded border px-3 py-2 text-sm ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm space-y-1 md:col-span-2">
            <span className="text-slate-700">Context</span>
            <select
              value={selectedContextKey}
              onChange={(event) => setSelectedContextKey(event.target.value)}
              className="w-full p-2 border rounded"
              disabled={isLoadingContexts || contexts.length === 0}
            >
              <option value="">Select context</option>
              {contexts.map((ctx) => (
                <option
                  key={`${ctx.course_offering_id}-${ctx.section_name}`}
                  value={`${ctx.course_offering_id}::${ctx.section_name}`}
                >
                  Term {ctx.term_number} | {ctx.course_code} | Section {ctx.section_name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm space-y-1">
            <span className="text-slate-700">Mark Type</span>
            <select
              value={markType}
              onChange={(event) => setMarkType(event.target.value)}
              className="w-full p-2 border rounded"
            >
              {MARK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm space-y-1">
            <span className="text-slate-700">Total Marks</span>
            <input
              type="number"
              min="1"
              value={totalMarks}
              onChange={(event) => setTotalMarks(event.target.value)}
              className="w-full p-2 border rounded"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm space-y-1">
            <span className="text-slate-700">Publish Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full p-2 border rounded">
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </label>

          <div className="text-xs text-slate-600 border rounded p-3 bg-slate-50">
            {workspace?.policies ? (
              <>
                CT policy: for {workspace.policies.ct_credit_count} credit(s), max CT entries are{' '}
                {workspace.policies.ct_max_components}; best {workspace.policies.ct_best_count} are counted.
              </>
            ) : (
              'Select context to view CT policy.'
            )}
          </div>
        </div>
      </div>

      {isLoadingWorkspace ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-slate-600">Loading workspace...</div>
      ) : null}

      {!isLoadingWorkspace && workspace ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Students</h2>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save Marks'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Roll</th>
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">Marks Obtained</th>
                </tr>
              </thead>
              <tbody>
                {(workspace.students || []).map((student) => (
                  <tr key={student.enrollment_id} className="border-t border-slate-200">
                    <td className="p-3">{student.roll_number}</td>
                    <td className="p-3">{student.student_name}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        value={marksByEnrollmentId[student.enrollment_id] || ''}
                        onChange={(event) => setMarkValue(student.enrollment_id, event.target.value)}
                        className="w-40 p-2 border rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default MarkEntrySection;
