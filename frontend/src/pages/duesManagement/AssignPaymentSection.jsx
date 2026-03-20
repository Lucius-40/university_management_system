const AssignPaymentSection = ({
  activeMode,
  paymentForm,
  setPaymentForm,
  students,
  dues,
  terms,
  departmentById,
  handlePaymentSubmit,
}) => {
  if (activeMode === "insertion") {
    return (
      <form onSubmit={handlePaymentSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Exception: Manual Student Assignment</h3>
          <p className="text-sm text-slate-600 mt-1">
            Use this only for exceptional cases (late joins, corrections, waivers). For investigation and preview, use Inspection to Dues.
          </p>
        </div>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Student</span>
          <select
            required
            value={paymentForm.student_id}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, student_id: event.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.user_id} value={student.user_id}>
                {student.roll_number} (ID {student.user_id})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Due</span>
          <select
            required
            value={paymentForm.due_id}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, due_id: event.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="">Select due</option>
            {dues.map((due) => (
              <option key={due.id} value={due.id}>
                {due.name} ({due.amount})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Term (optional)</span>
          <select
            value={paymentForm.term_id}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, term_id: event.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="">Global / all terms</option>
            {terms.map((term) => {
              const department = departmentById.get(Number(term.department_id));
              return (
                <option key={term.id} value={term.id}>
                  {department?.code || term.department_id} - Term {term.term_number}
                </option>
              );
            })}
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Status</span>
          <select
            value={paymentForm.status}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, status: event.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="Overdue">Overdue</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Amount Paid</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={paymentForm.amount_paid}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount_paid: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Amount Due Override (optional)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={paymentForm.amount_due_override}
            onChange={(event) =>
              setPaymentForm((prev) => ({ ...prev, amount_due_override: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Deadline (legacy)</span>
          <input
            type="date"
            value={paymentForm.deadline}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, deadline: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Due Date</span>
          <input
            type="date"
            value={paymentForm.due_date}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, due_date: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Payment Method (optional)</span>
          <select
            value={paymentForm.payment_method}
            onChange={(event) =>
              setPaymentForm((prev) => ({ ...prev, payment_method: event.target.value }))
            }
            className="w-full p-2 border rounded"
          >
            <option value="">Not specified</option>
            <option value="Mobile Banking">Mobile Banking</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Mobile Banking Number</span>
          <input
            value={paymentForm.mobile_banking_number}
            onChange={(event) =>
              setPaymentForm((prev) => ({ ...prev, mobile_banking_number: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1 md:col-span-2">
          <span className="text-slate-700">Waive Reason (optional)</span>
          <input
            value={paymentForm.waive_reason}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, waive_reason: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(paymentForm.required_for_registration)}
            onChange={(event) =>
              setPaymentForm((prev) => ({ ...prev, required_for_registration: event.target.checked }))
            }
          />
          Required for registration
        </label>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Save Payment Assignment
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
      Assigned payments inspection is not implemented yet.
    </div>
  );
};

export default AssignPaymentSection;
