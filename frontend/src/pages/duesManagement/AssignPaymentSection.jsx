const AssignPaymentSection = ({
  activeMode,
  paymentForm,
  setPaymentForm,
  students,
  dues,
  terms,
  departmentById,
  handlePaymentSubmit,
  paymentRequests,
  reviewingRequestId,
  handleReviewPaymentRequest,
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
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Student Payment Requests</h3>
        <p className="text-sm text-slate-600 mt-1">
          Review submitted payment requests and approve to apply paid amounts to student dues.
        </p>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Student</th>
              <th className="p-2 text-left">Due</th>
              <th className="p-2 text-left">Requested</th>
              <th className="p-2 text-left">Outstanding</th>
              <th className="p-2 text-left">Method</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paymentRequests.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-slate-500">
                  No payment requests yet.
                </td>
              </tr>
            ) : null}
            {paymentRequests.map((request) => {
              const isPending = request.status === "Pending";
              const isBusy = reviewingRequestId === request.id;

              return (
                <tr className="border-t" key={request.id}>
                  <td className="p-2">
                    <div className="font-medium text-slate-900">{request.roll_number || `ID ${request.student_id}`}</div>
                    <div className="text-xs text-slate-500">{request.student_name || "Unknown"}</div>
                  </td>
                  <td className="p-2">{request.due_name}</td>
                  <td className="p-2">{request.requested_amount}</td>
                  <td className="p-2">{request.outstanding_amount}</td>
                  <td className="p-2">
                    <div>{request.payment_method}</div>
                    {request.mobile_banking_number ? (
                      <div className="text-xs text-slate-500">{request.mobile_banking_number}</div>
                    ) : null}
                  </td>
                  <td className="p-2">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                        request.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : request.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {isPending ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewPaymentRequest(request.id, "approve")}
                          className="px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-60"
                          disabled={isBusy}
                        >
                          {isBusy ? "Processing..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewPaymentRequest(request.id, "reject")}
                          className="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                          disabled={isBusy}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500">Reviewed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignPaymentSection;
