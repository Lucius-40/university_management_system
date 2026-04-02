const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const BD_PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,119}$/;
const ROLL_REGEX = /^[A-Z]{2,5}\d{4,8}$/;

export const normalizeText = (value) => String(value ?? '').trim();
export const normalizeAddress = (value) => normalizeText(value).replace(/\s+/g, ' ');
export const normalizeEmail = (value) => normalizeText(value).toLowerCase();

export const normalizeBdPhone = (value) => {
  const raw = normalizeText(value);
  if (!raw) return '';

  const compact = raw.replace(/[\s()-]/g, '');
  if (compact.startsWith('+88')) return `0${compact.slice(3)}`;
  if (compact.startsWith('88')) return `0${compact.slice(2)}`;
  return compact;
};

export const validateEmail = (value) => {
  const normalized = normalizeEmail(value);
  if (!normalized) return 'Email is required.';
  if (!EMAIL_REGEX.test(normalized)) return 'Enter a valid email address.';
  return '';
};

export const validateBdPhone = (value, label = 'Phone number') => {
  const normalized = normalizeBdPhone(value);
  if (!normalized) return `${label} is required.`;
  if (!BD_PHONE_REGEX.test(normalized)) return `${label} must be a valid Bangladesh mobile number.`;
  return '';
};

export const validateName = (value, label = 'Name') => {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  if (!normalized) return `${label} is required.`;
  if (!NAME_REGEX.test(normalized)) return `${label} must be 2-120 characters and use letters only.`;
  return '';
};

export const validateAddress = (value, label = 'Address') => {
  const normalized = normalizeAddress(value);
  if (!normalized) return `${label} is required.`;
  if (normalized.length < 5 || normalized.length > 500) {
    return `${label} must be between 5 and 500 characters.`;
  }
  return '';
};

export const validateBirthDate = (value) => {
  const text = normalizeText(value);
  if (!text) return 'Birth date is required.';

  const date = new Date(text);
  const minDate = new Date('1900-01-01');
  const today = new Date();
  if (Number.isNaN(date.getTime()) || date < minDate || date > today) {
    return 'Birth date must be a valid date in the past.';
  }
  return '';
};

export const validateRollNumber = (value) => {
  const normalized = normalizeText(value).toUpperCase();
  if (!normalized) return 'Roll number is required.';
  if (!ROLL_REGEX.test(normalized)) return 'Roll number format is invalid.';
  return '';
};

export const validateTeacherCreateForm = (form) => {
  const errors = {};

  const nameError = validateName(form.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  const officialEmailError = validateEmail(form.official_mail);
  if (officialEmailError) errors.official_mail = officialEmailError;

  const mobileError = validateBdPhone(form.mobile_number, 'Mobile number');
  if (mobileError) errors.mobile_number = mobileError;

  const presentAddressError = validateAddress(form.present_address, 'Present address');
  if (presentAddressError) errors.present_address = presentAddressError;

  const permanentAddressError = validateAddress(form.permanent_address, 'Permanent address');
  if (permanentAddressError) errors.permanent_address = permanentAddressError;

  const birthDateError = validateBirthDate(form.birth_date);
  if (birthDateError) errors.birth_date = birthDateError;

  if (!normalizeText(form.department_id) || Number(form.department_id) <= 0) {
    errors.department_id = 'Select a valid department.';
  }

  return errors;
};

export const validateStudentCreateForm = (form) => {
  const errors = {};

  const nameError = validateName(form.name);
  if (nameError) errors.name = nameError;

  const rollError = validateRollNumber(form.roll_number);
  if (rollError) errors.roll_number = rollError;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  const officialEmailError = validateEmail(form.official_mail);
  if (officialEmailError) errors.official_mail = officialEmailError;

  const mobileError = validateBdPhone(form.mobile_number, 'Mobile number');
  if (mobileError) errors.mobile_number = mobileError;

  const presentAddressError = validateAddress(form.present_address, 'Present address');
  if (presentAddressError) errors.present_address = presentAddressError;

  const permanentAddressError = validateAddress(form.permanent_address, 'Permanent address');
  if (permanentAddressError) errors.permanent_address = permanentAddressError;

  const birthDateError = validateBirthDate(form.birth_date);
  if (birthDateError) errors.birth_date = birthDateError;

  if (!normalizeText(form.department_id) || Number(form.department_id) <= 0) {
    errors.department_id = 'Select a valid department.';
  }

  if (normalizeText(form.current_term) && Number(form.current_term) <= 0) {
    errors.current_term = 'Current term must be a positive number.';
  }

  return errors;
};

export const sanitizeTeacherCreateForm = (form) => {
  return {
    ...form,
    name: normalizeText(form.name).replace(/\s+/g, ' '),
    email: normalizeEmail(form.email),
    official_mail: normalizeEmail(form.official_mail),
    mobile_number: normalizeBdPhone(form.mobile_number),
    present_address: normalizeAddress(form.present_address),
    permanent_address: normalizeAddress(form.permanent_address),
    birth_date: normalizeText(form.birth_date),
    department_id: Number(form.department_id),
  };
};

export const sanitizeStudentCreateForm = (form) => {
  return {
    ...form,
    name: normalizeText(form.name).replace(/\s+/g, ' '),
    roll_number: normalizeText(form.roll_number).toUpperCase(),
    email: normalizeEmail(form.email),
    official_mail: normalizeEmail(form.official_mail),
    mobile_number: normalizeBdPhone(form.mobile_number),
    present_address: normalizeAddress(form.present_address),
    permanent_address: normalizeAddress(form.permanent_address),
    birth_date: normalizeText(form.birth_date),
    department_id: Number(form.department_id),
    current_term: normalizeText(form.current_term) ? Number(form.current_term) : null,
  };
};

export const firstValidationError = (errors) => {
  const [firstKey] = Object.keys(errors);
  return firstKey ? errors[firstKey] : '';
};
