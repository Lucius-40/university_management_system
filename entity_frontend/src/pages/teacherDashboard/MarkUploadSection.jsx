import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const MARK_TYPES = ['CT', 'Midterm', 'Attendance', 'Final'];

const MarkUploadSection = () => {
  const [contexts, setContexts] = useState([]);
  const [selectedContextKey, setSelectedContextKey] = useState('');
  const [markType, setMarkType] = useState('CT');
  const [totalMarks, setTotalMarks] = useState('20');
  const [status, setStatus] = useState('Published');
  const [file, setFile] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoadingContexts, setIsLoadingContexts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    setTotalMarks(String(defaultTotalByType[markType] || 20));
  }, [markType, defaultTotalByType]);

  useEffect(() => {
    const loadContexts = async () => {
      setIsLoadingContexts(true);
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

    loadContexts();
  }, []);

  const callCsvApi = async (dryRun) => {
    if (!selectedContext || !file) {
      setMessage({ type: 'error', text: 'Select context and choose a CSV file first.' });
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_offering_id', String(selectedContext.course_offering_id));
    formData.append('section_name', String(selectedContext.section_name));
    formData.append('mark_type', markType);
    formData.append('total_marks', String(totalMarks));
    formData.append('status', status);
    formData.append('dry_run', String(dryRun));

    const response = await api.post(`/markings/teacher/csv?dry_run=${dryRun ? 'true' : 'false'}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data || null;
  };

  const handlePreview = async () => {
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const data = await callCsvApi(true);
      setPreviewResult(data);
      setMessage({
        type: data.failed_count > 0 ? 'error' : 'success',
        text: `Preview complete. Valid: ${(data.total_rows || 0) - (data.failed_count || 0)}, Failed: ${data.failed_count || 0}.`,
      });
    } catch (error) {
      setPreviewResult(null);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'CSV preview failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommit = async () => {
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const data = await callCsvApi(false);
      setPreviewResult(data);
      setMessage({
        type: data.failed_count > 0 ? 'error' : 'success',
        text: `Import finished. Inserted: ${data.inserted_count || 0}, Updated: ${data.updated_count || 0}, Failed: ${data.failed_count || 0}.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'CSV import failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Mark Upload (CSV)</h1>
        <p className="text-slate-600">Upload marks for a selected section using CSV.</p>

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
            <select value={markType} onChange={(event) => setMarkType(event.target.value)} className="w-full p-2 border rounded">
              {MARK_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
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

        <div className="grid gap-3 md:grid-cols-3 items-end">
          <label className="text-sm space-y-1">
            <span className="text-slate-700">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full p-2 border rounded">
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </label>

          <label className="text-sm space-y-1 md:col-span-2">
            <span className="text-slate-700">CSV File</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full p-2 border rounded"
            />
          </label>
        </div>

        <div className="text-xs text-slate-600 border rounded p-3 bg-slate-50">
          CSV columns required: enrollment_id, marks_obtained. Optional: total_marks, status, component_id.
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isSubmitting || !file}
            className="px-4 py-2 rounded border hover:bg-slate-50 disabled:opacity-60"
          >
            {isSubmitting ? 'Working...' : 'Preview (Dry Run)'}
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={isSubmitting || !file}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Working...' : 'Import CSV'}
          </button>
        </div>
      </div>

      {previewResult ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Result Summary</h2>
            <p className="text-sm text-slate-600 mt-1">
              Total: {previewResult.total_rows || 0}, Inserted: {previewResult.inserted_count || 0}, Updated: {previewResult.updated_count || 0}, Failed: {previewResult.failed_count || 0}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Row</th>
                  <th className="p-3 text-left">Enrollment</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {(previewResult.results || []).map((row) => (
                  <tr key={`${row.row}-${row.enrollment_id || 'na'}`} className="border-t border-slate-200">
                    <td className="p-3">{row.row}</td>
                    <td className="p-3">{row.enrollment_id || '-'}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3 text-red-700">{row.reason || '-'}</td>
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

export default MarkUploadSection;
