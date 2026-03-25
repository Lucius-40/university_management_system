export const sortTermsDepartment = (terms = [], departments = []) => {
  const departmentById = new Map(
    (departments || []).map((department) => [
      Number(department.id),
      {
        code: String(department.code || "").toLowerCase(),
        name: String(department.name || "").toLowerCase(),
      },
    ])
  );

  return [...terms].sort((left, right) => {
    const leftDepartment = departmentById.get(Number(left.department_id)) || { code: "", name: "" };
    const rightDepartment = departmentById.get(Number(right.department_id)) || { code: "", name: "" };

    const codeCompare = leftDepartment.code.localeCompare(rightDepartment.code);
    if (codeCompare !== 0) return codeCompare;

    const nameCompare = leftDepartment.name.localeCompare(rightDepartment.name);
    if (nameCompare !== 0) return nameCompare;

    const termNumberCompare = Number(left.term_number || 0) - Number(right.term_number || 0);
    if (termNumberCompare !== 0) return termNumberCompare;

    return Number(left.id || 0) - Number(right.id || 0);
  });
};
