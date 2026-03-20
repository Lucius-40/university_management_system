const ModeToggle = ({ supportsModeToggle, activeMode, setActiveMode }) => {
  if (!supportsModeToggle) return null;

  return (
    <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={() => setActiveMode("insertion")}
        className={`rounded px-4 py-2 text-sm font-medium ${
          activeMode === "insertion" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
        }`}
      >
        Insertion
      </button>
      <button
        type="button"
        onClick={() => setActiveMode("inspection")}
        className={`rounded px-4 py-2 text-sm font-medium ${
          activeMode === "inspection" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
        }`}
      >
        Inspection
      </button>
    </div>
  );
};

export default ModeToggle;
