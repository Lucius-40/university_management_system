const ModeToggle = ({ activeMode, setActiveMode, includeBatch = false }) => {
  const modes = includeBatch
    ? ["insertion", "inspection", "batch"]
    : ["insertion", "inspection"];

  return (
    <div className="mb-6 border border-gray-200 rounded">
      <div className="flex flex-wrap gap-2 p-2">
        {modes.map((mode) => {
          const selected = activeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveMode(mode)}
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border transition ${
                selected
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {mode}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeToggle;
