import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "../services/api";
import DueSection from "./duesManagement/DueSection";
import RuleSection from "./duesManagement/RuleSection";
import ScopeSection from "./duesManagement/ScopeSection";
import OverrideSection from "./duesManagement/OverrideSection";
import AssignPaymentSection from "./duesManagement/AssignPaymentSection";
import ModeToggle from "./duesManagement/ModeToggle";

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

const DuesManagement = ({ initialTab = "dues" }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [activeMode, setActiveMode] = useState("insertion");
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

  const renderBody = () => {
    if (activeTab === "dues") {
      return (
        <DueSection
          activeMode={activeMode}
          dueForm={dueForm}
          setDueForm={setDueForm}
          editingDueId={editingDueId}
          setEditingDueId={setEditingDueId}
          dueSearch={dueSearch}
          setDueSearch={setDueSearch}
          filteredDues={filteredDues}
          handleDueSubmit={handleDueSubmit}
          handleDueEdit={handleDueEdit}
          handleDueDelete={handleDueDelete}
        />
      );
    }
    if (activeTab === "rules") {
      return (
        <RuleSection
          activeMode={activeMode}
          ruleForm={ruleForm}
          setRuleForm={setRuleForm}
          rules={rules}
          dues={dues}
          issuingRuleId={issuingRuleId}
          handleRuleSubmit={handleRuleSubmit}
          handleIssueRule={handleIssueRule}
        />
      );
    }
    if (activeTab === "scopes") {
      return (
        <ScopeSection
          activeMode={activeMode}
          scopeForm={scopeForm}
          setScopeForm={setScopeForm}
          rules={rules}
          departments={departments}
          handleScopeSubmit={handleScopeSubmit}
        />
      );
    }
    if (activeTab === "overrides") {
      return (
        <OverrideSection
          activeMode={activeMode}
          overrideForm={overrideForm}
          setOverrideForm={setOverrideForm}
          rules={rules}
          departments={departments}
          handleOverrideSubmit={handleOverrideSubmit}
        />
      );
    }
    if (activeTab === "assign-payment") {
      return (
        <AssignPaymentSection
          activeMode={activeMode}
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          students={students}
          dues={dues}
          terms={terms}
          departmentById={departmentById}
          handlePaymentSubmit={handlePaymentSubmit}
        />
      );
    }
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

      <ModeToggle supportsModeToggle={true} activeMode={activeMode} setActiveMode={setActiveMode} />

      {renderBody()}
    </div>
  );
};

export default DuesManagement;
