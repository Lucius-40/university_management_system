import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import api from "../services/api";

const TABS = [
  "dues",
  "rules",
  "scopes",
  "overrides",
  "assign-payment",
];

const TAB_LABELS = {
  dues: "dues",
  rules: "rules",
  scopes: "scopes",
  overrides: "overrides",
  "assign-payment": "exception payment",
};

const INITIAL_DUE_FORM = {
  name: "",
  amount: "",
  bank_account_number: "",
  is_active: true,
  required_for_registration: true,
  description: "",
};

const INITIAL_RULE_FORM = {
  name: "",
  due_id: "",
  frequency: "per_year",
  required_for_registration: true,
  is_active: true,
  issue_offset_days: 7,
  starts_on: "",
  ends_on: "",
};

const INITIAL_SCOPE_FORM = {
  rule_id: "",
  department_id: "",
  term_number: "",
  section_name: "",
  batch_year: "",
};

const INITIAL_OVERRIDE_FORM = {
  rule_id: "",
  department_id: "",
  term_number: "",
  section_name: "",
  batch_year: "",
  override_amount: "",
};

const INITIAL_PAYMENT_FORM = {
  student_id: "",
  due_id: "",
  term_id: "",
  amount_paid: "0",
  amount_due_override: "",
  status: "Overdue",
  deadline: "",
  due_date: "",
  payment_method: "",
  mobile_banking_number: "",
  required_for_registration: true,
  waive_reason: "",
};

const DuesManagement = () => {
  const [activeTab, setActiveTab] = useState("dues");
  const [message, setMessage] = useState({ type: "", text: "" });

  const [dues, setDues] = useState([]);
  const [rules, setRules] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [students, setStudents] = useState([]);

  const [dueSearch, setDueSearch] = useState("");
  const [issuingRuleId, setIssuingRuleId] = useState(null);

  const [dueForm, setDueForm] = useState(INITIAL_DUE_FORM);
  const [editingDueId, setEditingDueId] = useState(null);

  const [ruleForm, setRuleForm] = useState(INITIAL_RULE_FORM);
  const [scopeForm, setScopeForm] = useState(INITIAL_SCOPE_FORM);
  const [overrideForm, setOverrideForm] = useState(INITIAL_OVERRIDE_FORM);
  const [paymentForm, setPaymentForm] = useState(INITIAL_PAYMENT_FORM);

  const fetchMeta = useCallback(async () => {
    try {
      const [duesResponse, rulesResponse, departmentsResponse, termsResponse, studentsResponse] =
        await Promise.all([
          api.get("/payments/dues"),
          api.get("/payments/rules"),
          api.get("/departments"),
          api.get("/terms"),
          api.get("/students"),
        ]);

      setDues(duesResponse.data || []);
      setRules(rulesResponse.data || []);
      setDepartments(departmentsResponse.data || []);
      setTerms(termsResponse.data || []);
      setStudents(studentsResponse.data || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load dues management data.",
      });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchMeta();
    });
  }, [fetchMeta]);

  const departmentById = useMemo(() => {
    return new Map((departments || []).map((department) => [Number(department.id), department]));
  }, [departments]);

  const filteredDues = useMemo(() => {
    const q = dueSearch.trim().toLowerCase();
    if (!q) return dues;

    return dues.filter((due) => {
      return (
        String(due.name || "").toLowerCase().includes(q) ||
        String(due.description || "").toLowerCase().includes(q) ||
        String(due.amount || "").toLowerCase().includes(q)
      );
    });
  }, [dues, dueSearch]);

  const clearMessage = () => setMessage({ type: "", text: "" });

  const handleDueSubmit = async (event) => {
    event.preventDefault();
    clearMessage();

    try {
      const payload = {
        ...dueForm,
        amount: Number(dueForm.amount),
      };

      if (editingDueId) {
        await api.put(`/payments/dues/${editingDueId}`, payload);
        setMessage({ type: "success", text: "Due updated successfully." });
      } else {
        await api.post("/payments/dues", payload);
        setMessage({ type: "success", text: "Due created successfully." });
      }

      setDueForm(INITIAL_DUE_FORM);
      setEditingDueId(null);
      await fetchMeta();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to save due.",
      });
    }
  };

  const handleDueEdit = (due) => {
    setEditingDueId(due.id);
    setDueForm({
      name: due.name || "",
      amount: due.amount ?? "",
      bank_account_number: due.bank_account_number || "",
      is_active: due.is_active !== false,
      required_for_registration: due.required_for_registration !== false,
      description: due.description || "",
    });
    setActiveTab("dues");
  };

  const handleDueDelete = async (dueId) => {
    const confirmed = window.confirm("Delete this due definition?");
    if (!confirmed) return;

    clearMessage();
    try {
      await api.delete(`/payments/dues/${dueId}`);
      setMessage({ type: "success", text: "Due deleted successfully." });
      await fetchMeta();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to delete due.",
      });
    }
  };

  const handleRuleSubmit = async (event) => {
    event.preventDefault();
    clearMessage();

    if (!ruleForm.due_id) {
      setMessage({ type: "error", text: "Please select a due for this rule." });
      return;
    }

    try {
      const payload = {
        ...ruleForm,
        due_id: Number(ruleForm.due_id),
        issue_offset_days: Number(ruleForm.issue_offset_days || 0),
        starts_on: ruleForm.starts_on || null,
        ends_on: ruleForm.ends_on || null,
      };
      await api.post("/payments/rules", payload);
      setRuleForm(INITIAL_RULE_FORM);
      setMessage({ type: "success", text: "Rule created successfully." });
      await fetchMeta();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to create due rule.",
      });
    }
  };

  const handleScopeSubmit = async (event) => {
    event.preventDefault();
    clearMessage();

    if (!scopeForm.rule_id) {
      setMessage({ type: "error", text: "Select a rule before adding scope." });
      return;
    }

    try {
      const payload = {
        department_id: scopeForm.department_id ? Number(scopeForm.department_id) : null,
        term_number: scopeForm.term_number ? Number(scopeForm.term_number) : null,
        section_name: scopeForm.section_name || null,
        batch_year: scopeForm.batch_year ? Number(scopeForm.batch_year) : null,
      };

      await api.post(`/payments/rules/${scopeForm.rule_id}/scopes`, payload);
      setScopeForm(INITIAL_SCOPE_FORM);
      setMessage({ type: "success", text: "Rule scope added successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to add rule scope.",
      });
    }
  };

  const handleOverrideSubmit = async (event) => {
    event.preventDefault();
    clearMessage();

    if (!overrideForm.rule_id) {
      setMessage({ type: "error", text: "Select a rule before adding amount override." });
      return;
    }
    if (!overrideForm.override_amount) {
      setMessage({ type: "error", text: "Override amount is required." });
      return;
    }

    try {
      const payload = {
        department_id: overrideForm.department_id ? Number(overrideForm.department_id) : null,
        term_number: overrideForm.term_number ? Number(overrideForm.term_number) : null,
        section_name: overrideForm.section_name || null,
        batch_year: overrideForm.batch_year ? Number(overrideForm.batch_year) : null,
        override_amount: Number(overrideForm.override_amount),
      };

      await api.post(`/payments/rules/${overrideForm.rule_id}/amount-overrides`, payload);
      setOverrideForm(INITIAL_OVERRIDE_FORM);
      setMessage({ type: "success", text: "Amount override added successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to add amount override.",
      });
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    clearMessage();

    if (!paymentForm.student_id || !paymentForm.due_id) {
      setMessage({ type: "error", text: "Student and due are required." });
      return;
    }

    try {
      const payload = {
        student_id: Number(paymentForm.student_id),
        due_id: Number(paymentForm.due_id),
        term_id: paymentForm.term_id ? Number(paymentForm.term_id) : null,
        amount_paid: Number(paymentForm.amount_paid || 0),
        amount_due_override: paymentForm.amount_due_override ? Number(paymentForm.amount_due_override) : null,
        status: paymentForm.status,
        deadline: paymentForm.deadline || null,
        due_date: paymentForm.due_date || null,
        payment_method: paymentForm.payment_method || null,
        mobile_banking_number: paymentForm.mobile_banking_number || null,
        required_for_registration: Boolean(paymentForm.required_for_registration),
        waive_reason: paymentForm.waive_reason || null,
      };

      await api.post("/payments/pay", payload);
      setPaymentForm(INITIAL_PAYMENT_FORM);
      setMessage({ type: "success", text: "Student payment due record created." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to assign student payment due.",
      });
    }
  };

  const handleIssueRule = async (ruleId) => {
    const confirmed = window.confirm("Issue this rule now for all matched students?");
    if (!confirmed) return;

    clearMessage();
    setIssuingRuleId(ruleId);

    try {
      const response = await api.post(`/payments/rules/${ruleId}/issue`);
      const data = response.data || {};
      setMessage({
        type: "success",
        text: `Issuance done. Issued ${data.issued_count || 0}, skipped ${data.skipped_count || 0}, matched ${data.matched_count || 0}.`,
      });
      await fetchMeta();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to issue rule.",
      });
    } finally {
      setIssuingRuleId(null);
    }
  };

  const renderDuesTab = () => (
    <div className="space-y-6">
      <form onSubmit={handleDueSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
        <h3 className="md:col-span-2 text-lg font-semibold text-slate-900">
          {editingDueId ? "Edit Due" : "Create Due"}
        </h3>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Name</span>
          <input
            required
            value={dueForm.name}
            onChange={(event) => setDueForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Amount</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={dueForm.amount}
            onChange={(event) => setDueForm((prev) => ({ ...prev, amount: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Bank Account Number</span>
          <input
            value={dueForm.bank_account_number}
            onChange={(event) =>
              setDueForm((prev) => ({ ...prev, bank_account_number: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Description</span>
          <input
            value={dueForm.description}
            onChange={(event) => setDueForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(dueForm.required_for_registration)}
            onChange={(event) =>
              setDueForm((prev) => ({ ...prev, required_for_registration: event.target.checked }))
            }
          />
          Required for registration
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(dueForm.is_active)}
            onChange={(event) => setDueForm((prev) => ({ ...prev, is_active: event.target.checked }))}
          />
          Active
        </label>

        <div className="md:col-span-2 flex gap-2 justify-end">
          {editingDueId && (
            <button
              type="button"
              onClick={() => {
                setEditingDueId(null);
                setDueForm(INITIAL_DUE_FORM);
              }}
              className="px-4 py-2 rounded border bg-white hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          )}
          <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" type="submit">
            {editingDueId ? "Update Due" : "Create Due"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Dues List</h3>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={dueSearch}
              onChange={(event) => setDueSearch(event.target.value)}
              placeholder="Search dues"
              className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Required</th>
                <th className="p-2 text-left">Active</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDues.map((due) => (
                <tr className="border-t" key={due.id}>
                  <td className="p-2">{due.name}</td>
                  <td className="p-2">{due.amount}</td>
                  <td className="p-2">{due.required_for_registration ? "Yes" : "No"}</td>
                  <td className="p-2">{due.is_active ? "Yes" : "No"}</td>
                  <td className="p-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDueEdit(due)}
                      className="px-2 py-1 rounded border hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDueDelete(due.id)}
                      className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRulesTab = () => (
    <div className="space-y-6">
      <form onSubmit={handleRuleSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
        <h3 className="md:col-span-2 text-lg font-semibold text-slate-900">Create Due Rule</h3>

        <label className="text-sm space-y-1">
          <span>Rule Name</span>
          <input
            required
            value={ruleForm.name}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span>Due</span>
          <select
            required
            value={ruleForm.due_id}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, due_id: event.target.value }))}
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
          <span>Frequency</span>
          <select
            value={ruleForm.frequency}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, frequency: event.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="per_year">Per Year</option>
            <option value="per_term">Per Term</option>
            <option value="one_time">One Time</option>
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span>Issue Offset Days</span>
          <input
            type="number"
            min="0"
            value={ruleForm.issue_offset_days}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, issue_offset_days: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span>Starts On</span>
          <input
            type="date"
            value={ruleForm.starts_on}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, starts_on: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span>Ends On</span>
          <input
            type="date"
            value={ruleForm.ends_on}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, ends_on: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(ruleForm.required_for_registration)}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, required_for_registration: event.target.checked }))
            }
          />
          Required for registration
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(ruleForm.is_active)}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, is_active: event.target.checked }))}
          />
          Rule active
        </label>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Create Rule
          </button>
        </div>
      </form>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Rules</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Rule</th>
                <th className="p-2 text-left">Due</th>
                <th className="p-2 text-left">Frequency</th>
                <th className="p-2 text-left">Required</th>
                <th className="p-2 text-left">Active</th>
                <th className="p-2 text-left">Issue</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-t">
                  <td className="p-2">{rule.name}</td>
                  <td className="p-2">{rule.due_name}</td>
                  <td className="p-2">{rule.frequency}</td>
                  <td className="p-2">{rule.required_for_registration ? "Yes" : "No"}</td>
                  <td className="p-2">{rule.is_active ? "Yes" : "No"}</td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => handleIssueRule(rule.id)}
                      disabled={issuingRuleId === rule.id}
                      className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {issuingRuleId === rule.id ? "Issuing..." : "Issue"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderScopeTab = () => (
    <form onSubmit={handleScopeSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
      <h3 className="md:col-span-2 text-lg font-semibold text-slate-900">Add Rule Scope</h3>

      <label className="text-sm space-y-1">
        <span>Rule</span>
        <select
          required
          value={scopeForm.rule_id}
          onChange={(event) => setScopeForm((prev) => ({ ...prev, rule_id: event.target.value }))}
          className="w-full p-2 border rounded"
        >
          <option value="">Select rule</option>
          {rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm space-y-1">
        <span>Department (optional)</span>
        <select
          value={scopeForm.department_id}
          onChange={(event) =>
            setScopeForm((prev) => ({ ...prev, department_id: event.target.value }))
          }
          className="w-full p-2 border rounded"
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.code} - {department.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm space-y-1">
        <span>Term Number (optional)</span>
        <input
          type="number"
          min="1"
          value={scopeForm.term_number}
          onChange={(event) => setScopeForm((prev) => ({ ...prev, term_number: event.target.value }))}
          className="w-full p-2 border rounded"
        />
      </label>

      <label className="text-sm space-y-1">
        <span>Section Name (optional)</span>
        <input
          value={scopeForm.section_name}
          onChange={(event) => setScopeForm((prev) => ({ ...prev, section_name: event.target.value }))}
          className="w-full p-2 border rounded"
        />
      </label>

      <label className="text-sm space-y-1">
        <span>Batch Year (optional)</span>
        <input
          type="number"
          min="1900"
          max="3000"
          value={scopeForm.batch_year}
          onChange={(event) => setScopeForm((prev) => ({ ...prev, batch_year: event.target.value }))}
          className="w-full p-2 border rounded"
        />
      </label>

      <div className="md:col-span-2 flex justify-end">
        <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
          Add Scope
        </button>
      </div>
    </form>
  );

  const renderOverridesTab = () => (
    <form onSubmit={handleOverrideSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
      <h3 className="md:col-span-2 text-lg font-semibold text-slate-900">Add Rule Amount Override</h3>

      <label className="text-sm space-y-1">
        <span>Rule</span>
        <select
          required
          value={overrideForm.rule_id}
          onChange={(event) => setOverrideForm((prev) => ({ ...prev, rule_id: event.target.value }))}
          className="w-full p-2 border rounded"
        >
          <option value="">Select rule</option>
          {rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm space-y-1">
        <span>Override Amount</span>
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={overrideForm.override_amount}
          onChange={(event) =>
            setOverrideForm((prev) => ({ ...prev, override_amount: event.target.value }))
          }
          className="w-full p-2 border rounded"
        />
      </label>

      <label className="text-sm space-y-1">
        <span>Department (optional)</span>
        <select
          value={overrideForm.department_id}
          onChange={(event) =>
            setOverrideForm((prev) => ({ ...prev, department_id: event.target.value }))
          }
          className="w-full p-2 border rounded"
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.code} - {department.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm space-y-1">
        <span>Term Number (optional)</span>
        <input
          type="number"
          min="1"
          value={overrideForm.term_number}
          onChange={(event) =>
            setOverrideForm((prev) => ({ ...prev, term_number: event.target.value }))
          }
          className="w-full p-2 border rounded"
        />
      </label>

      <label className="text-sm space-y-1">
        <span>Section Name (optional)</span>
        <input
          value={overrideForm.section_name}
          onChange={(event) =>
            setOverrideForm((prev) => ({ ...prev, section_name: event.target.value }))
          }
          className="w-full p-2 border rounded"
        />
      </label>

      <label className="text-sm space-y-1">
        <span>Batch Year (optional)</span>
        <input
          type="number"
          min="1900"
          max="3000"
          value={overrideForm.batch_year}
          onChange={(event) => setOverrideForm((prev) => ({ ...prev, batch_year: event.target.value }))}
          className="w-full p-2 border rounded"
        />
      </label>

      <div className="md:col-span-2 flex justify-end">
        <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
          Add Override
        </button>
      </div>
    </form>
  );

  const renderAssignPaymentTab = () => (
    <form onSubmit={handlePaymentSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold text-slate-900">Exception: Manual Student Assignment</h3>
        <p className="text-sm text-slate-600 mt-1">
          Use this only for exceptional cases (late joins, corrections, waivers). For investigation and preview, use Inspection to Dues.
        </p>
      </div>

      <label className="text-sm space-y-1">
        <span>Student</span>
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
        <span>Due</span>
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
        <span>Term (optional)</span>
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
        <span>Status</span>
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
        <span>Amount Paid</span>
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
        <span>Amount Due Override (optional)</span>
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
        <span>Deadline (legacy)</span>
        <input
          type="date"
          value={paymentForm.deadline}
          onChange={(event) => setPaymentForm((prev) => ({ ...prev, deadline: event.target.value }))}
          className="w-full p-2 border rounded"
        />
      </label>

      <label className="text-sm space-y-1">
        <span>Due Date</span>
        <input
          type="date"
          value={paymentForm.due_date}
          onChange={(event) => setPaymentForm((prev) => ({ ...prev, due_date: event.target.value }))}
          className="w-full p-2 border rounded"
        />
      </label>

      <label className="text-sm space-y-1">
        <span>Payment Method (optional)</span>
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
        <span>Mobile Banking Number</span>
        <input
          value={paymentForm.mobile_banking_number}
          onChange={(event) =>
            setPaymentForm((prev) => ({ ...prev, mobile_banking_number: event.target.value }))
          }
          className="w-full p-2 border rounded"
        />
      </label>

      <label className="text-sm space-y-1 md:col-span-2">
        <span>Waive Reason (optional)</span>
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

  const renderBody = () => {
    if (activeTab === "dues") return renderDuesTab();
    if (activeTab === "rules") return renderRulesTab();
    if (activeTab === "scopes") return renderScopeTab();
    if (activeTab === "overrides") return renderOverridesTab();
    if (activeTab === "assign-payment") return renderAssignPaymentTab();
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dues & Payments</h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage due definitions, rule conditions, scoped amount overrides, and student payment assignment.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchMeta}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border bg-white text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {message.text && (
          <div
            className={`mt-4 rounded border px-3 py-2 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded text-sm font-medium border ${
                activeTab === tab
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {TAB_LABELS[tab] || tab.replaceAll("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {renderBody()}

      {/* <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="font-medium mb-1">Current API coverage note</div>
        <p>
          Rule creation, scope creation, amount override creation, due CRUD, and payment assignment are available.
          Update/delete for rules, scopes, overrides, and payment records are not exposed by backend endpoints yet.
        </p>
      </div> */}
    </div>
  );
};

export default DuesManagement;
