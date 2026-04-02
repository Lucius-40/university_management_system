const ALLOWED_ROLES = new Set(['student', 'teacher', 'system']);
const ALLOWED_STUDENT_STATUS = new Set(['Active', 'Graduated', 'Paused']);
const ALLOWED_APPOINTMENTS = new Set([
    'Department Head',
    'Professor',
    'Assistant Professor',
    'Lecturer',
    'Adjunct Faculty',
]);

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const BD_PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,119}$/;
const ROLL_REGEX = /^[A-Z]{2,5}\d{4,8}$/;
const BANK_ACCOUNT_REGEX = /^[A-Za-z0-9\- ]{8,34}$/;
const NID_REGEX = /^(?:\d{10}|\d{13}|\d{17})$/;
const PASSPORT_REGEX = /^(?:[A-Za-z]{1,2}\d{7,8}|\d{9})$/;

const normalizeText = (value) => String(value ?? '').trim();
const normalizeAddress = (value) => normalizeText(value).replace(/\s+/g, ' ');
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const normalizeBdPhone = (value) => {
    const raw = normalizeText(value);
    if (!raw) return '';

    const compact = raw.replace(/[\s()-]/g, '');
    if (compact.startsWith('+88')) return `0${compact.slice(3)}`;
    if (compact.startsWith('88')) return `0${compact.slice(2)}`;
    return compact;
};

const parsePositiveInt = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isValidDateString = (value) => {
    const text = normalizeText(value);
    if (!text) return false;

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return false;

    const today = new Date();
    const minDate = new Date('1900-01-01');
    return date <= today && date >= minDate;
};

const addError = (errors, field, message) => {
    if (!errors[field]) {
        errors[field] = message;
    }
};

const validateEmailField = (errors, field, value, required = false) => {
    const normalized = normalizeEmail(value);
    if (!normalized && required) {
        addError(errors, field, `${field} is required.`);
        return normalized;
    }
    if (normalized && !EMAIL_REGEX.test(normalized)) {
        addError(errors, field, `${field} must be a valid email.`);
    }
    return normalized;
};

const validatePhoneField = (errors, field, value, required = false) => {
    const normalized = normalizeBdPhone(value);
    if (!normalized && required) {
        addError(errors, field, `${field} is required.`);
        return normalized;
    }
    if (normalized && !BD_PHONE_REGEX.test(normalized)) {
        addError(errors, field, `${field} must be a valid Bangladesh phone number.`);
    }
    return normalized;
};

const validateNameField = (errors, field, value, required = false) => {
    const normalized = normalizeText(value).replace(/\s+/g, ' ');
    if (!normalized && required) {
        addError(errors, field, `${field} is required.`);
        return normalized;
    }
    if (normalized && !NAME_REGEX.test(normalized)) {
        addError(errors, field, `${field} must be 2-120 chars and contain letters only.`);
    }
    return normalized;
};

const validateAddressField = (errors, field, value, required = false) => {
    const normalized = normalizeAddress(value);
    if (!normalized && required) {
        addError(errors, field, `${field} is required.`);
        return normalized;
    }
    if (normalized && (normalized.length < 5 || normalized.length > 500)) {
        addError(errors, field, `${field} must be between 5 and 500 characters.`);
    }
    return normalized;
};

const validateProfileShape = (body, allowedFields) => {
    const errors = {};
    const payload = {};

    const keys = Object.keys(body || {});
    if (!keys.length) {
        addError(errors, '_schema', 'Request body cannot be empty.');
        return { errors, payload };
    }

    for (const key of keys) {
        if (!allowedFields.has(key)) {
            addError(errors, key, `${key} is not allowed.`);
            continue;
        }
        payload[key] = body[key];
    }

    return { errors, payload };
};

const validateUserRegisterPayload = (body = {}) => {
    const errors = {};

    const payload = {
        name: validateNameField(errors, 'name', body.name, true),
        email: validateEmailField(errors, 'email', body.email, true),
        password: normalizeText(body.password),
        role: normalizeText(body.role).toLowerCase(),
        mobile_number: validatePhoneField(errors, 'mobile_number', body.mobile_number, true),
        present_address: validateAddressField(errors, 'present_address', body.present_address, true),
        permanent_address: validateAddressField(errors, 'permanent_address', body.permanent_address, true),
        birth_date: normalizeText(body.birth_date),
        mobile_banking_number: null,
        bank_account_number: null,
        birth_reg_number: null,
        nid_number: null,
        passport_number: null,
        emergency_contact_name: null,
        emergency_contact_number: null,
        emergency_contact_relation: null,
    };

    if (!payload.password || payload.password.length < 8) {
        addError(errors, 'password', 'password must be at least 8 characters.');
    }

    if (!ALLOWED_ROLES.has(payload.role)) {
        addError(errors, 'role', 'role must be one of student, teacher, or system.');
    }

    if (!isValidDateString(payload.birth_date)) {
        addError(errors, 'birth_date', 'birth_date must be a valid date in the past.');
    }

    if (body.mobile_banking_number !== undefined) {
        const mobileBanking = validatePhoneField(errors, 'mobile_banking_number', body.mobile_banking_number, false);
        payload.mobile_banking_number = mobileBanking || null;
    }

    if (body.bank_account_number !== undefined) {
        const bankAccount = normalizeText(body.bank_account_number);
        payload.bank_account_number = bankAccount || null;
        if (bankAccount && !BANK_ACCOUNT_REGEX.test(bankAccount)) {
            addError(errors, 'bank_account_number', 'bank_account_number must be 8-34 alphanumeric chars.');
        }
    }

    if (body.birth_reg_number !== undefined) {
        const birthReg = normalizeText(body.birth_reg_number);
        payload.birth_reg_number = birthReg || null;
        if (birthReg && birthReg.length < 6) {
            addError(errors, 'birth_reg_number', 'birth_reg_number must be at least 6 characters.');
        }
    }

    if (body.nid_number !== undefined) {
        const nid = normalizeText(body.nid_number);
        payload.nid_number = nid || null;
        if (nid && !NID_REGEX.test(nid)) {
            addError(errors, 'nid_number', 'nid_number must be 10, 13, or 17 digits.');
        }
    }

    if (body.passport_number !== undefined) {
        const passport = normalizeText(body.passport_number).toUpperCase();
        payload.passport_number = passport || null;
        if (passport && !PASSPORT_REGEX.test(passport)) {
            addError(errors, 'passport_number', 'passport_number format is invalid.');
        }
    }

    if (body.emergency_contact_name !== undefined) {
        const emergencyName = validateNameField(errors, 'emergency_contact_name', body.emergency_contact_name, false);
        payload.emergency_contact_name = emergencyName || null;
    }

    if (body.emergency_contact_number !== undefined) {
        const emergencyNumber = validatePhoneField(errors, 'emergency_contact_number', body.emergency_contact_number, false);
        payload.emergency_contact_number = emergencyNumber || null;
    }

    if (body.emergency_contact_relation !== undefined) {
        const relation = normalizeText(body.emergency_contact_relation);
        payload.emergency_contact_relation = relation || null;
        if (relation && relation.length > 50) {
            addError(errors, 'emergency_contact_relation', 'emergency_contact_relation cannot exceed 50 characters.');
        }
    }

    return { errors, payload };
};

const validateUserUpdatePayload = (body = {}) => {
    const allowedFields = new Set([
        'name',
        'mobile_number',
        'email',
        'mobile_banking_number',
        'bank_account_number',
        'present_address',
        'permanent_address',
        'birth_reg_number',
        'birth_date',
        'nid_number',
        'passport_number',
        'emergency_contact_name',
        'emergency_contact_number',
        'emergency_contact_relation',
    ]);

    const { errors, payload } = validateProfileShape(body, allowedFields);

    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
        payload.name = validateNameField(errors, 'name', payload.name, true);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
        payload.email = validateEmailField(errors, 'email', payload.email, true);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'mobile_number')) {
        payload.mobile_number = validatePhoneField(errors, 'mobile_number', payload.mobile_number, true);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'mobile_banking_number')) {
        const val = validatePhoneField(errors, 'mobile_banking_number', payload.mobile_banking_number, false);
        payload.mobile_banking_number = val || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'present_address')) {
        payload.present_address = validateAddressField(errors, 'present_address', payload.present_address, true);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'permanent_address')) {
        const val = validateAddressField(errors, 'permanent_address', payload.permanent_address, false);
        payload.permanent_address = val || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'birth_date')) {
        payload.birth_date = normalizeText(payload.birth_date);
        if (!isValidDateString(payload.birth_date)) {
            addError(errors, 'birth_date', 'birth_date must be a valid date in the past.');
        }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'bank_account_number')) {
        const val = normalizeText(payload.bank_account_number);
        payload.bank_account_number = val || null;
        if (val && !BANK_ACCOUNT_REGEX.test(val)) {
            addError(errors, 'bank_account_number', 'bank_account_number must be 8-34 alphanumeric chars.');
        }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'birth_reg_number')) {
        const val = normalizeText(payload.birth_reg_number);
        payload.birth_reg_number = val || null;
        if (val && val.length < 6) {
            addError(errors, 'birth_reg_number', 'birth_reg_number must be at least 6 characters.');
        }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'nid_number')) {
        const val = normalizeText(payload.nid_number);
        payload.nid_number = val || null;
        if (val && !NID_REGEX.test(val)) {
            addError(errors, 'nid_number', 'nid_number must be 10, 13, or 17 digits.');
        }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'passport_number')) {
        const val = normalizeText(payload.passport_number).toUpperCase();
        payload.passport_number = val || null;
        if (val && !PASSPORT_REGEX.test(val)) {
            addError(errors, 'passport_number', 'passport_number format is invalid.');
        }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'emergency_contact_name')) {
        const val = validateNameField(errors, 'emergency_contact_name', payload.emergency_contact_name, false);
        payload.emergency_contact_name = val || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'emergency_contact_number')) {
        const val = validatePhoneField(errors, 'emergency_contact_number', payload.emergency_contact_number, false);
        payload.emergency_contact_number = val || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'emergency_contact_relation')) {
        const val = normalizeText(payload.emergency_contact_relation);
        payload.emergency_contact_relation = val || null;
        if (val && val.length > 50) {
            addError(errors, 'emergency_contact_relation', 'emergency_contact_relation cannot exceed 50 characters.');
        }
    }

    return { errors, payload };
};

const validateStudentPayload = (body = {}, options = {}) => {
    const partial = options.partial === true;
    const errors = {};
    const payload = {};
    const allowedFields = new Set(['user_id', 'roll_number', 'official_mail', 'status', 'current_term']);

    if (partial && Object.keys(body || {}).length === 0) {
        addError(errors, '_schema', 'Request body cannot be empty.');
        return { errors, payload };
    }

    for (const key of Object.keys(body || {})) {
        if (!allowedFields.has(key)) {
            addError(errors, key, `${key} is not allowed.`);
        }
    }

    if (!partial) {
        payload.user_id = parsePositiveInt(body.user_id);
        if (!payload.user_id) {
            addError(errors, 'user_id', 'user_id must be a positive integer.');
        }
    } else if (body.user_id !== undefined) {
        addError(errors, 'user_id', 'user_id cannot be updated in this endpoint.');
    }

    const roll = normalizeText(body.roll_number).toUpperCase();
    if (!partial || body.roll_number !== undefined) {
        if (!roll) {
            addError(errors, 'roll_number', 'roll_number is required.');
        } else if (!ROLL_REGEX.test(roll)) {
            addError(errors, 'roll_number', 'roll_number format is invalid.');
        }
        payload.roll_number = roll;
    }

    const officialMail = normalizeEmail(body.official_mail);
    if (!partial || body.official_mail !== undefined) {
        if (!officialMail) {
            addError(errors, 'official_mail', 'official_mail is required.');
        } else if (!EMAIL_REGEX.test(officialMail)) {
            addError(errors, 'official_mail', 'official_mail must be a valid email.');
        }
        payload.official_mail = officialMail;
    }

    if (!partial || body.status !== undefined) {
        const status = normalizeText(body.status || 'Active');
        if (!ALLOWED_STUDENT_STATUS.has(status)) {
            addError(errors, 'status', 'status must be Active, Graduated, or Paused.');
        }
        payload.status = status;
    }

    if (!partial || body.current_term !== undefined) {
        if (body.current_term == null || String(body.current_term).trim() === '') {
            payload.current_term = null;
        } else {
            const currentTerm = parsePositiveInt(body.current_term);
            if (!currentTerm) {
                addError(errors, 'current_term', 'current_term must be a positive integer.');
            }
            payload.current_term = currentTerm;
        }
    }

    return { errors, payload };
};

const validateTeacherPayload = (body = {}, options = {}) => {
    const partial = options.partial === true;
    const errors = {};
    const payload = {};
    const allowedFields = new Set(['user_id', 'appointment', 'official_mail', 'department_id']);

    if (partial && Object.keys(body || {}).length === 0) {
        addError(errors, '_schema', 'Request body cannot be empty.');
        return { errors, payload };
    }

    for (const key of Object.keys(body || {})) {
        if (!allowedFields.has(key)) {
            addError(errors, key, `${key} is not allowed.`);
        }
    }

    if (!partial) {
        payload.user_id = parsePositiveInt(body.user_id);
        if (!payload.user_id) {
            addError(errors, 'user_id', 'user_id must be a positive integer.');
        }
    } else if (body.user_id !== undefined) {
        addError(errors, 'user_id', 'user_id cannot be updated in this endpoint.');
    }

    if (!partial || body.appointment !== undefined) {
        const appointment = normalizeText(body.appointment);
        if (!appointment) {
            addError(errors, 'appointment', 'appointment is required.');
        } else if (!ALLOWED_APPOINTMENTS.has(appointment)) {
            addError(errors, 'appointment', 'appointment is invalid.');
        }
        payload.appointment = appointment;
    }

    if (!partial || body.official_mail !== undefined) {
        const officialMail = normalizeEmail(body.official_mail);
        if (!officialMail) {
            addError(errors, 'official_mail', 'official_mail is required.');
        } else if (!EMAIL_REGEX.test(officialMail)) {
            addError(errors, 'official_mail', 'official_mail must be a valid email.');
        }
        payload.official_mail = officialMail;
    }

    if (!partial || body.department_id !== undefined) {
        const departmentId = parsePositiveInt(body.department_id);
        if (!departmentId) {
            addError(errors, 'department_id', 'department_id must be a positive integer.');
        }
        payload.department_id = departmentId;
    }

    return { errors, payload };
};

module.exports = {
    validateAddressField,
    validateEmailField,
    validateNameField,
    validatePhoneField,
    parsePositiveInt,
    validateStudentPayload,
    validateTeacherPayload,
    validateUserRegisterPayload,
    validateUserUpdatePayload,
};
