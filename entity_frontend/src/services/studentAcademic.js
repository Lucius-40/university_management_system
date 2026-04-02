import api from "./api";

export const getStudentAcademicOverview = async (userId) => {
  if (!userId) {
    throw new Error("Student id is required.");
  }

  const response = await api.get(`/students/${encodeURIComponent(userId)}/academic-overview`);
  return response.data || {};
};
