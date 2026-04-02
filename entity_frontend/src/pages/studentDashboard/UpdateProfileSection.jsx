import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import Loader from "../../components/Loader";
import { useAuth } from "../../context/AuthContext";
import { readAuthSession } from "../../utils/authStorage";

const FIELD_CONFIG = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "mobile_number", label: "Mobile Number", type: "text" },
  { name: "birth_date", label: "Birth Date", type: "date", required: true },
  { name: "birth_reg_number", label: "Birth Registration Number", type: "text", required: true },
  { name: "nid_number", label: "NID Number", type: "text" },
  { name: "passport_number", label: "Passport Number", type: "text" },
  { name: "mobile_banking_number", label: "Mobile Banking Number", type: "text" },
  { name: "bank_account_number", label: "Bank Account Number", type: "text" },
  { name: "emergency_contact_name", label: "Emergency Contact Name", type: "text" },
  {
    name: "emergency_contact_number",
    label: "Emergency Contact Number",
    type: "text",
    required: true,
  },
  {
    name: "emergency_contact_relation",
    label: "Emergency Contact Relation",
    type: "text",
  },
  {
    name: "present_address",
    label: "Present Address",
    type: "textarea",
    required: true,
    fullWidth: true,
  },
  {
    name: "permanent_address",
    label: "Permanent Address",
    type: "textarea",
    fullWidth: true,
  },
];

const EMPTY_FORM = FIELD_CONFIG.reduce((acc, field) => {
  acc[field.name] = "";
  return acc;
}, {});

const REQUIRED_FIELDS = new Set(
  FIELD_CONFIG.filter((field) => field.required).map((field) => field.name)
);

const NULLABLE_FIELDS = new Set([
  "mobile_number",
  "mobile_banking_number",
  "bank_account_number",
  "permanent_address",
  "nid_number",
  "passport_number",
  "emergency_contact_name",
  "emergency_contact_relation",
]);

const mapSourceToForm = (source) => {
  if (!source || typeof source !== "object") return { ...EMPTY_FORM };
  return FIELD_CONFIG.reduce((acc, field) => {
    const value = source[field.name];
    acc[field.name] = value == null ? "" : String(value);
    return acc;
  }, {});
};

const toPayload = (form) => {
  return FIELD_CONFIG.reduce((acc, field) => {
    const rawValue = form[field.name] ?? "";
    const normalized = typeof rawValue === "string" ? rawValue.trim() : rawValue;

    if (NULLABLE_FIELDS.has(field.name) && normalized === "") {
      acc[field.name] = null;
      return acc;
    }

    acc[field.name] = normalized;
    return acc;
  }, {});
};

const validateForm = (form) => {
  const errors = {};

  FIELD_CONFIG.forEach((field) => {
    if (!REQUIRED_FIELDS.has(field.name)) return;
    if (!String(form[field.name] ?? "").trim()) {
      errors[field.name] = `${field.label} is required.`;
    }
  });

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  const hasNid = Boolean(String(form.nid_number ?? "").trim());
  const hasPassport = Boolean(String(form.passport_number ?? "").trim());
  if (!hasNid && !hasPassport) {
    const msg = "Provide at least one of NID Number or Passport Number.";
    errors.nid_number = msg;
    errors.passport_number = msg;
  }

  return errors;
};

const UpdateProfileSection = () => {
  const { user, token, login } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;
  const userId = sessionUser?.id;

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await api.get("/users/profile");
      const source = response.data?.user || response.data?.profile;
      const nextForm = mapSourceToForm(source);
      setForm(nextForm);
      setProfileImageUrl(source?.profile_image_url || "");
      setSelectedImageFile(null);
      setImagePreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return "";
      });
    } catch (error) {
      const errorText = error.response?.data?.message || error.response?.data?.error || "Failed to load profile.";
      setMessage({ type: "error", text: errorText });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }

    if (!String(file.type || "").startsWith("image/")) {
      setMessage({ type: "error", text: "Please choose a valid image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be 5MB or less." });
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setImagePreviewUrl(preview);
    setMessage({ type: "", text: "" });
  };

  const handleUploadProfileImage = async () => {
    if (!userId) {
      setMessage({ type: "error", text: "No user id found in session. Please login again." });
      return;
    }

    if (!selectedImageFile) {
      setMessage({ type: "error", text: "Select an image first." });
      return;
    }

    setIsUpdatingImage(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("file", selectedImageFile);

      const response = await api.post(`/users/${encodeURIComponent(userId)}/profile-image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updatedUser = response.data?.user || {};
      setProfileImageUrl(updatedUser.profile_image_url || "");
      setSelectedImageFile(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl("");
      setMessage({ type: "success", text: response.data?.message || "Profile image updated successfully." });
    } catch (error) {
      const errorText = error.response?.data?.message || error.response?.data?.error || "Failed to upload profile image.";
      setMessage({ type: "error", text: errorText });
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!userId) {
      setMessage({ type: "error", text: "No user id found in session. Please login again." });
      return;
    }

    setIsUpdatingImage(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await api.delete(`/users/${encodeURIComponent(userId)}/profile-image`);
      setProfileImageUrl("");
      setSelectedImageFile(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl("");
      setMessage({ type: "success", text: response.data?.message || "Profile image removed successfully." });
    } catch (error) {
      const errorText = error.response?.data?.message || error.response?.data?.error || "Failed to remove profile image.";
      setMessage({ type: "error", text: errorText });
    } finally {
      setIsUpdatingImage(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setMessage({ type: "error", text: "No user id found in session. Please login again." });
      return;
    }
    loadProfile();
  }, [loadProfile, userId]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userId) {
      setMessage({ type: "error", text: "No user id found in session. Please login again." });
      return;
    }

    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setMessage({ type: "error", text: "Please fix the highlighted fields." });
      return;
    }

    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = toPayload(form);
      const response = await api.put(`/users/${encodeURIComponent(userId)}`, payload);
      const updatedUser = response.data?.user || {};

      setForm(mapSourceToForm(updatedUser));
      setProfileImageUrl(updatedUser.profile_image_url || profileImageUrl || "");
      setMessage({ type: "success", text: response.data?.message || "Profile updated successfully." });

      if (token && typeof login === "function") {
        login({
          token,
          user: {
            ...(sessionUser || {}),
            name: updatedUser.name ?? sessionUser?.name,
            email: updatedUser.email ?? sessionUser?.email,
            id: sessionUser?.id,
          },
        });
      }
    } catch (error) {
      const errorText = error.response?.data?.message || error.response?.data?.error || "Failed to update profile.";
      setMessage({ type: "error", text: errorText });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Update Profile</h2>
        <button
          type="button"
          onClick={loadProfile}
          className="px-3 py-2 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {message.text ? (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 rounded border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800 mb-3">Profile Image</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden border border-slate-300 bg-white">
              {imagePreviewUrl || profileImageUrl ? (
                <img
                  src={imagePreviewUrl || profileImageUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
                  No Image
                </div>
              )}
            </div>

            <div className="flex-1 min-w-60 space-y-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageSelection}
                className="w-full text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleUploadProfileImage}
                  disabled={!selectedImageFile || isUpdatingImage}
                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {isUpdatingImage ? "Uploading..." : "Upload Image"}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveProfileImage}
                  disabled={(!profileImageUrl && !imagePreviewUrl) || isUpdatingImage}
                  className="px-3 py-1.5 rounded border border-slate-300 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Remove Image
                </button>
              </div>
            </div>
          </div>
        </div>

        {FIELD_CONFIG.map((field) => {
          const fieldError = errors[field.name];
          const commonClass = `w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            fieldError ? "border-red-400" : "border-slate-300"
          }`;

          return (
            <label
              key={field.name}
              className={`text-sm space-y-1 ${field.fullWidth ? "md:col-span-2" : ""}`}
            >
              <span className="text-slate-700">
                {field.label}
                {field.required ? <span className="text-red-500"> *</span> : null}
              </span>

              {field.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={form[field.name]}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  className={commonClass}
                />
              ) : (
                <input
                  type={field.type}
                  value={form[field.name]}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  className={commonClass}
                />
              )}

              {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
            </label>
          );
        })}

        <div className="md:col-span-2 flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateProfileSection;
