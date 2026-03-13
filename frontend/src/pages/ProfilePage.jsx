import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";

const toTitle = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);
const SENSITIVE_PROFILE_KEYS = new Set(["password_hash", "refresh_token"]);

const shouldHideProfileKey = (key = "") => {
  const normalized = String(key).toLowerCase();
  if (SENSITIVE_PROFILE_KEYS.has(normalized)) return true;
  if (normalized === "id") return true;
  if (normalized === "user_id") return true;
  if (normalized.endsWith("_id")) return true;
  return false;
};

const ProfilePage = () => {
  const { role, id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const cacheKey = `profile-${role}-${id}`;

  const fetchProfile = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError("");

    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setData(JSON.parse(cached));
          setIsLoading(false);
          return;
        }
      }

      const response = await api.get(`/users/profile/${encodeURIComponent(role)}/${encodeURIComponent(id)}`);
      setData(response.data);
      localStorage.setItem(cacheKey, JSON.stringify(response.data));
    } catch (requestError) {
      console.error("Failed to load profile:", requestError);
      setError(requestError.response?.data?.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, id, role]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  const profile = data?.profile || {};
  const visibleProfileEntries = Object.entries(profile).filter(([key]) => !shouldHideProfileKey(key));

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-6">
      <div className="bg-white border rounded-lg p-6 flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="mt-2 text-3xl font-bold text-gray-800">{toTitle(role)} Profile</h1>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200 text-gray-700"
          onClick={() => fetchProfile(true)}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg p-6">
        {visibleProfileEntries.length === 0 ? (
          <p className="text-gray-500">No profile details available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleProfileEntries.map(([key, value]) => (
              <div key={key} className=" rounded p-3 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{key.replaceAll("_", " ")}</p>
                <p className="text-sm font-medium text-gray-800 mt-1">{String(value ?? "-")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
