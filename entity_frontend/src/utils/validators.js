const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const BD_PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,119}$/;
const NID_REGEX = /^(?:\d{10}|\d{13}|\d{17})$/;
const PASSPORT_REGEX = /^(?:[A-Za-z]{1,2}\d{7,8}|\d{9})$/;
const BANK_ACCOUNT_REGEX = /^[A-Za-z0-9\- ]{8,34}$/;

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
  if (!EMAIL_REGEX.test(normalized)) return 'Please enter a valid email address.';
  return '';
};

export const validateBdPhone = (value, label = 'Phone number', required = true) => {
  const normalized = normalizeBdPhone(value);
  if (!normalized && required) return `${label} is required.`;
  if (normalized && !BD_PHONE_REGEX.test(normalized)) {
    return `${label} must be a valid Bangladesh mobile number.`;
  }
  return '';
};

export const validateName = (value, label = 'Name', required = true) => {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  if (!normalized && required) return `${label} is required.`;
  if (normalized && !NAME_REGEX.test(normalized)) {
    return `${label} must be 2-120 characters and use letters only.`;
  }
  return '';
};

export const validateAddress = (value, label = 'Address', required = true) => {
  const normalized = normalizeAddress(value);
  if (!normalized && required) return `${label} is required.`;
  if (normalized && (normalized.length < 5 || normalized.length > 500)) {
    return `${label} must be between 5 and 500 characters.`;
  }
  return '';
};

export const validateBirthDate = (value, required = true) => {
  const text = normalizeText(value);
  if (!text && required) return 'Birth date is required.';
  if (!text) return '';

  const date = new Date(text);
  const minDate = new Date('1900-01-01');
  const today = new Date();
  if (Number.isNaN(date.getTime()) || date < minDate || date > today) {
    return 'Birth date must be a valid date in the past.';
  }
  return '';
};

export const validateNid = (value, required = false) => {
  const text = normalizeText(value);
  if (!text && required) return 'NID number is required.';
  if (text && !NID_REGEX.test(text)) return 'NID must be 10, 13, or 17 digits.';
  return '';
};

export const validatePassport = (value, required = false) => {
  const text = normalizeText(value).toUpperCase();
  if (!text && required) return 'Passport number is required.';
  if (text && !PASSPORT_REGEX.test(text)) return 'Passport format is invalid.';
  return '';
};

export const validateBankAccount = (value, required = false) => {
  const text = normalizeText(value);
  if (!text && required) return 'Bank account number is required.';
  if (text && !BANK_ACCOUNT_REGEX.test(text)) {
    return 'Bank account number must be 8-34 alphanumeric characters.';
  }
  return '';
};

export const validateProfileForm = (form, requiredFields = new Set()) => {
  const errors = {};

  const nameError = validateName(form.name, 'Name', requiredFields.has('name'));
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  const mobileError = validateBdPhone(form.mobile_number, 'Mobile number', requiredFields.has('mobile_number'));
  if (mobileError) errors.mobile_number = mobileError;

  const presentAddressError = validateAddress(
    form.present_address,
    'Present address',
    requiredFields.has('present_address')
  );
  if (presentAddressError) errors.present_address = presentAddressError;

  const permanentAddressError = validateAddress(form.permanent_address, 'Permanent address', false);
  if (permanentAddressError) errors.permanent_address = permanentAddressError;

  const birthDateError = validateBirthDate(form.birth_date, requiredFields.has('birth_date'));
  if (birthDateError) errors.birth_date = birthDateError;

  const emergencyNameError = validateName(
    form.emergency_contact_name,
    'Emergency contact name',
    false
  );
  if (emergencyNameError) errors.emergency_contact_name = emergencyNameError;

  const emergencyNumberError = validateBdPhone(
    form.emergency_contact_number,
    'Emergency contact number',
    requiredFields.has('emergency_contact_number')
  );
  if (emergencyNumberError) errors.emergency_contact_number = emergencyNumberError;

  const bankingNumberError = validateBdPhone(form.mobile_banking_number, 'Mobile banking number', false);
  if (bankingNumberError) errors.mobile_banking_number = bankingNumberError;

  const bankAccountError = validateBankAccount(form.bank_account_number, false);
  if (bankAccountError) errors.bank_account_number = bankAccountError;

  const nidError = validateNid(form.nid_number, false);
  if (nidError) errors.nid_number = nidError;

  const passportError = validatePassport(form.passport_number, false);
  if (passportError) errors.passport_number = passportError;

  if (!normalizeText(form.nid_number) && !normalizeText(form.passport_number)) {
    const msg = 'Provide at least one of NID Number or Passport Number.';
    errors.nid_number = msg;
    errors.passport_number = msg;
  }

  return errors;
};

export const sanitizeProfileForm = (form, nullableFields = new Set()) => {
  const next = { ...form };

  Object.keys(next).forEach((key) => {
    if (key === 'email') {
      next[key] = normalizeEmail(next[key]);
      return;
    }

    if (key === 'mobile_number' || key === 'mobile_banking_number' || key === 'emergency_contact_number') {
      const normalized = normalizeBdPhone(next[key]);
      next[key] = normalized;
    } else if (key === 'present_address' || key === 'permanent_address') {
      next[key] = normalizeAddress(next[key]);
    } else if (key === 'name' || key === 'emergency_contact_name') {
      next[key] = normalizeText(next[key]).replace(/\s+/g, ' ');
    } else if (key === 'passport_number') {
      next[key] = normalizeText(next[key]).toUpperCase();
    } else {
      next[key] = normalizeText(next[key]);
    }

    if (nullableFields.has(key) && !next[key]) {
      next[key] = null;
    }
  });

  return next;
};
