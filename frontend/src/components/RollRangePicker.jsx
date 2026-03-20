import { useState, useMemo } from "react";

const RollRangePicker = ({ value, onChange, departmentCode = "" }) => {
  const [mode, setMode] = useState("single"); // "single" or "range"
  const [singleRoll, setSingleRoll] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Parse roll format: CSE2305160 -> prefix: "CSE", number: "2305160"
  const parseRoll = (roll) => {
    const match = roll.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    return { prefix: match[1], number: match[2] };
  };

  // Generate rolls from range
  const generateRolls = () => {
    if (mode === "single") {
      return singleRoll ? [singleRoll] : [];
    }

    if (!rangeStart || !rangeEnd) return [];

    const startParsed = parseRoll(rangeStart);
    const endParsed = parseRoll(rangeEnd);

    if (!startParsed || !endParsed) return [];
    if (startParsed.prefix !== endParsed.prefix) return [];

    const startNum = parseInt(startParsed.number, 10);
    const endNum = parseInt(endParsed.number, 10);

    if (startNum > endNum) return [];

    const rolls = [];
    for (let i = startNum; i <= endNum; i++) {
      rolls.push(`${startParsed.prefix}${String(i).padStart(startParsed.number.length, "0")}`);
    }
    return rolls;
  };

  const generatedRolls = useMemo(generateRolls, [mode, singleRoll, rangeStart, rangeEnd]);

  return (
    <div className="border rounded p-4 bg-gray-50 space-y-4">
      <div className="flex gap-4 border-b pb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={mode === "single"}
            onChange={() => setMode("single")}
            className="accent-blue-600"
          />
          <span className="text-sm font-medium">Single Roll</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={mode === "range"}
            onChange={() => setMode("range")}
            className="accent-blue-600"
          />
          <span className="text-sm font-medium">Roll Range</span>
        </label>
      </div>

      {mode === "single" ? (
        <div>
          <label className="block text-sm font-medium mb-2">Roll Number</label>
          <input
            type="text"
            placeholder={departmentCode ? `e.g., ${departmentCode}2305160` : "e.g., CSE2305160"}
            value={singleRoll}
            onChange={(e) => setSingleRoll(e.target.value.toUpperCase())}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            pattern="[A-Z]+\d+"
            title="Format: PREFIX+NUMBERS (e.g., CSE2305160)"
          />
          <p className="text-xs text-gray-600 mt-1">Format: {departmentCode || "PREFIX"}+NUMBERS</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-2">Start Roll</label>
            <input
              type="text"
              placeholder={departmentCode ? `${departmentCode}2305160` : "CSE2305160"}
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value.toUpperCase())}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="[A-Z]+\d+"
              title="Format: PREFIX+NUMBERS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Roll</label>
            <input
              type="text"
              placeholder={departmentCode ? `${departmentCode}2305170` : "CSE2305170"}
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value.toUpperCase())}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="[A-Z]+\d+"
              title="Format: PREFIX+NUMBERS"
            />
          </div>
        </div>
      )}

      {generatedRolls.length > 0 && (
        <div className="border-t pt-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Preview ({generatedRolls.length} roll{generatedRolls.length !== 1 ? "s" : ""})
            </span>
            <button
              type="button"
              onClick={() => onChange({ target: { value: generatedRolls } })}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
            >
              Add {generatedRolls.length} roll{generatedRolls.length !== 1 ? "s" : ""}
            </button>
          </div>
          <div className="bg-white border rounded p-2 max-h-24 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {generatedRolls.slice(0, 20).map((roll) => (
                <span key={roll} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {roll}
                </span>
              ))}
              {generatedRolls.length > 20 && (
                <span className="text-xs text-gray-600 px-2 py-1">
                  +{generatedRolls.length - 20} more...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {generatedRolls.length === 0 && (mode === "range" || (mode === "single" && !singleRoll)) && (
        <div className="text-xs text-gray-500 text-center py-2 bg-white border rounded">
          Enter roll number(s) to see preview
        </div>
      )}
    </div>
  );
};

export default RollRangePicker;
