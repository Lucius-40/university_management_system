const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getOrdinalSuffix = (day) => {
  if (day > 3 && day < 21) return "th";

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const parseDateValue = (value) => {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (DATE_ONLY_PATTERN.test(raw)) {
    const [year, month, day] = raw.split("-").map((part) => Number(part));
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildUtcDateKey = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return null;

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(
    parsed.getUTCDate()
  ).padStart(2, "0")}`;
};

export const formatDateDisplay = (value, fallback = "-") => {
  const parsed = parseDateValue(value);
  if (!parsed) return fallback;

  const day = parsed.getUTCDate();
  const month = MONTHS[parsed.getUTCMonth()];
  const year = parsed.getUTCFullYear();
  return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
};

export const formatDateInput = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return "";

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(
    parsed.getUTCDate()
  ).padStart(2, "0")}`;
};

export const compareDateOnly = (left, right) => {
  const leftKey = buildUtcDateKey(left);
  const rightKey = buildUtcDateKey(right);

  if (!leftKey || !rightKey) return null;
  if (leftKey === rightKey) return 0;
  return leftKey > rightKey ? 1 : -1;
};
