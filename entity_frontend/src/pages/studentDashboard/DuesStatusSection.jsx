import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { readAuthSession } from '../../utils/authStorage';
import { formatDateDisplay } from '../../utils/dateFormat';
import { normalizeBdPhone, validateBdPhone } from '../../utils/validators';

const PAYMENT_METHODS = ['Mobile Banking', 'Bank Transfer'];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) => {
  return toNumber(value).toFixed(2);
};

const DuesStatusSection = () => {
  const { user } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;

  const [dues, setDues] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [submittingDueId, setSubmittingDueId] = useState(null);
  const [requestFormByDueId, setRequestFormByDueId] = useState({});

  const loadDues = async () => {
    if (!sessionUser?.id) {
      setMessage({ type: 'error', text: 'No student session found. Please log in again.' });
      return;
    }

    setIsLoading(true);
    setMessage((prev) => (prev.type === 'error' ? { type: '', text: '' } : prev));

    try {
      const response = await api.get('/payments/my/dues');
      const rows = Array.isArray(response.data) ? response.data : [];
      setDues(rows);
    } catch (error) {
      setDues([]);
      setMessage({
        type: 'error',
        text:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to load your dues status.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.id]);

  const outstandingDues = useMemo(() => {
    return dues.filter((item) => toNumber(item.outstanding_amount) > 0 && !item.waived_at);
  }, [dues]);

  const blockingDues = useMemo(() => {
    return dues.filter((item) => Boolean(item.is_blocking_registration));
  }, [dues]);

  const summary = useMemo(() => {
    return dues.reduce(
      (acc, item) => {
        acc.totalEffective += toNumber(item.effective_due_amount);
        acc.totalPaid += toNumber(item.amount_paid);
        acc.totalOutstanding += toNumber(item.outstanding_amount);
        return acc;
      },
      { totalEffective: 0, totalPaid: 0, totalOutstanding: 0 }
    );
  }, [dues]);

  const getRequestFormState = (dueId) => {
    const fallbackDue = outstandingDues.find((row) => row.id === dueId);
    const defaultAmount = fallbackDue ? formatMoney(fallbackDue.outstanding_amount) : '0.00';
    return (
      requestFormByDueId[dueId] || {
        requested_amount: defaultAmount,
        payment_method: 'Mobile Banking',
        mobile_banking_number: '',
        note: '',
      }
    );
  };

  const updateRequestForm = (dueId, patch) => {
    setRequestFormByDueId((prev) => ({
      ...prev,
      [dueId]: {
        ...getRequestFormState(dueId),
        ...patch,
      },
    }));
  };

  const submitPaymentRequest = async (dueRow) => {
    const dueId = dueRow.id;
    const form = getRequestFormState(dueId);
    const requestedAmount = toNumber(form.requested_amount);
    const outstandingAmount = toNumber(dueRow.outstanding_amount);

    if (requestedAmount <= 0) {
      setMessage({ type: 'error', text: 'Requested amount must be greater than zero.' });
      return;
    }

    if (requestedAmount > outstandingAmount) {
      setMessage({ type: 'error', text: 'Requested amount cannot exceed outstanding amount.' });
      return;
    }

    if (!PAYMENT_METHODS.includes(form.payment_method)) {
      setMessage({ type: 'error', text: 'Select a valid payment method.' });
      return;
    }

    let normalizedBankingNumber = null;
    if (form.payment_method === 'Mobile Banking') {
      const numberError = validateBdPhone(form.mobile_banking_number, 'Mobile banking number', true);
      if (numberError) {
        setMessage({ type: 'error', text: numberError });
        return;
      }
      normalizedBankingNumber = normalizeBdPhone(form.mobile_banking_number);
    }

    setSubmittingDueId(dueId);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/payments/my/payment-requests', {
        student_due_payment_id: dueId,
        requested_amount: requestedAmount,
        payment_method: form.payment_method,
        mobile_banking_number: normalizedBankingNumber,
        note: form.note || null,
      });

      setMessage({
        type: 'success',
        text: `Payment recorded for ${dueRow.due_name}.`,
      });

      await loadDues();
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error.response?.data?.error ||
          error.response?.data?.message ||
            'Failed to record payment.',
      });
    } finally {
      setSubmittingDueId(null);
    }
  };

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dues Status</h1>
            <p className="text-slate-600 mt-1">
              Review outstanding dues and record your payment submissions.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDues}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={isLoading || submittingDueId !== null}
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-600">Total Due</p>
            <p className="text-xl font-semibold text-slate-900">{formatMoney(summary.totalEffective)}</p>
          </div>
          <div className="rounded border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">Total Paid</p>
            <p className="text-xl font-semibold text-green-800">{formatMoney(summary.totalPaid)}</p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-700">Outstanding</p>
            <p className="text-xl font-semibold text-amber-800">{formatMoney(summary.totalOutstanding)}</p>
          </div>
        </div>

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

        {isLoading ? <p className="text-slate-600">Loading dues...</p> : null}
      </div>

      {!isLoading && blockingDues.length > 0 ? (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-6 space-y-3 text-orange-900">
          <h2 className="text-xl font-semibold">Registration Blockers</h2>
          <p className="text-sm">You currently have required unpaid dues that block course registration.</p>
          <div className="overflow-x-auto border border-orange-200 rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-orange-100">
                <tr>
                  <th className="p-3 text-left">Due</th>
                  <th className="p-3 text-left">Due Date</th>
                  <th className="p-3 text-left">Required</th>
                  <th className="p-3 text-left">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {blockingDues.map((row) => (
                  <tr key={`block-${row.id}`} className="border-t border-orange-200">
                    <td className="p-3 font-medium">{row.due_name}</td>
                    <td className="p-3">{formatDateDisplay(row.due_date || row.deadline)}</td>
                    <td className="p-3">Yes</td>
                    <td className="p-3 font-semibold">{formatMoney(row.outstanding_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!isLoading && outstandingDues.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-slate-700">
          No outstanding dues at the moment.
        </div>
      ) : null}

      {!isLoading && outstandingDues.length > 0
        ? outstandingDues.map((row) => {
            const form = getRequestFormState(row.id);

            return (
              <div key={row.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{row.due_name}</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Due date: {formatDateDisplay(row.due_date || row.deadline)}
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      Accepted payment account/number:{' '}
                      <span className="font-medium text-slate-900">
                        {row.bank_account_number || 'Not specified. Please contact office.'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-block rounded bg-slate-100 text-slate-700 px-2 py-1 text-xs font-semibold">
                      Status: {row.status}
                    </span>
                    {Boolean(row.is_blocking_registration) ? (
                      <span className="inline-block rounded bg-orange-100 text-orange-800 px-2 py-1 text-xs font-semibold">
                        Blocks Registration
                      </span>
                    ) : null}
                    {row.latest_request_status ? (
                      <span className="inline-block rounded bg-blue-100 text-blue-800 px-2 py-1 text-xs font-semibold">
                        Last Record: {row.latest_request_status}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Effective Due</p>
                    <p className="text-base font-semibold text-slate-900">{formatMoney(row.effective_due_amount)}</p>
                  </div>
                  <div className="rounded border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Amount Paid</p>
                    <p className="text-base font-semibold text-slate-900">{formatMoney(row.amount_paid)}</p>
                  </div>
                  <div className="rounded border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-700">Remaining</p>
                    <p className="text-base font-semibold text-amber-900">{formatMoney(row.outstanding_amount)}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Record Payment</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm space-y-1">
                      <span className="text-slate-700">Requested Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.requested_amount}
                        onChange={(event) =>
                          updateRequestForm(row.id, { requested_amount: event.target.value })
                        }
                        className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={submittingDueId === row.id}
                      />
                    </label>

                    <label className="text-sm space-y-1">
                      <span className="text-slate-700">Payment Method</span>
                      <select
                        value={form.payment_method}
                        onChange={(event) =>
                          updateRequestForm(row.id, { payment_method: event.target.value })
                        }
                        className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={submittingDueId === row.id}
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </label>

                    {form.payment_method === 'Mobile Banking' ? (
                      <label className="text-sm space-y-1 md:col-span-2">
                        <span className="text-slate-700">Mobile Banking Number</span>
                        <input
                          value={form.mobile_banking_number}
                          onChange={(event) =>
                            updateRequestForm(row.id, {
                              mobile_banking_number: event.target.value,
                            })
                          }
                          className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={submittingDueId === row.id}
                        />
                      </label>
                    ) : null}

                    <label className="text-sm space-y-1 md:col-span-2">
                      <span className="text-slate-700">Note (optional)</span>
                      <input
                        value={form.note}
                        onChange={(event) => updateRequestForm(row.id, { note: event.target.value })}
                        placeholder="Reference number or additional details"
                        className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={submittingDueId === row.id}
                      />
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => submitPaymentRequest(row)}
                      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      disabled={submittingDueId === row.id}
                    >
                      {submittingDueId === row.id ? 'Recording...' : 'Record Payment'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        : null}
    </section>
  );
};

export default DuesStatusSection;
