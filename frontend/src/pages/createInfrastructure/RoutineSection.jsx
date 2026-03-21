import { useEffect, useState } from "react";
import api from "../../services/api";

const RoutineSection = ({ activeTab, clearInfrastructureCaches, fetchData, setMessage }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentRoutineUrl, setCurrentRoutineUrl] = useState("");
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadCurrentRoutine = async () => {
    setLoadingCurrent(true);
    try {
      const response = await api.get("/routines/current");
      setCurrentRoutineUrl(response.data?.routine?.file_url || "");
    } catch (error) {
      setCurrentRoutineUrl("");
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load current routine.",
      });
    } finally {
      setLoadingCurrent(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "routine") return;
    loadCurrentRoutine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (activeTab !== "routine") return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setMessage({ type: "error", text: "Please choose a PDF file first." });
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setMessage({ type: "error", text: "Only PDF files are allowed." });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploading(true);
    try {
      await api.post("/routines/current", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSelectedFile(null);
      setMessage({ type: "success", text: "Routine uploaded successfully." });
      clearInfrastructureCaches();
      await fetchData(true);
      await loadCurrentRoutine();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to upload routine.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Upload Initial Exam Routine</h2>
        <p className="text-sm text-gray-600 mt-1">
          Uploading a new routine will replace the previous routine URL in the database.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Routine PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload Routine"}
        </button>
      </form>

      <div className="border rounded p-4 bg-gray-50">
        <h3 className="font-semibold text-gray-800">Current Routine</h3>
        {loadingCurrent ? <p className="text-sm text-gray-600 mt-2">Loading...</p> : null}
        {!loadingCurrent && !currentRoutineUrl ? (
          <p className="text-sm text-gray-600 mt-2">No routine uploaded yet.</p>
        ) : null}
        {!loadingCurrent && currentRoutineUrl ? (
          <a
            href={currentRoutineUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-blue-700 hover:underline"
          >
            Open current routine PDF
          </a>
        ) : null}
      </div>
    </div>
  );
};

export default RoutineSection;
