const ModeToggle = ({ supportsModeToggle, activeMode, setActiveMode, includeBatch = false }) => {
  if (!supportsModeToggle) return null;

  const modes = includeBatch
    ? ["insertion", "inspection", "batch"]
    : ["insertion", "inspection"];

  return (
    <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setActiveMode(mode)}
          className={`rounded px-4 py-2 text-sm font-medium ${
            activeMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          {mode === "batch" ? "Batch Insertion" : mode === "insertion" ? "Insertion" : "Inspection"}
        </button>
      ))}
    </div>
  );
};

export default ModeToggle;
