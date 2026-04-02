const {
    parsePositiveInt,
    validateStudentPayload,
    validateTeacherPayload,
    validateUserRegisterPayload,
    validateUserUpdatePayload,
} = require('../utils/inputValidation');

const sendValidationError = (res, errors) => {
    return res.status(400).json({
        message: 'Validation failed.',
        errors,
    });
};

const validateParamId = (paramName) => {
    return (req, res, next) => {
        const parsed = parsePositiveInt(req.params?.[paramName]);
        if (!parsed) {
            return res.status(400).json({ message: `Invalid ${paramName}.` });
        }

        if (!req.validatedParams) {
            req.validatedParams = {};
        }
        req.validatedParams[paramName] = parsed;
        return next();
    };
};

const validateUserRegister = (req, res, next) => {
    const { errors, payload } = validateUserRegisterPayload(req.body || {});
    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, errors);
    }
    req.validatedBody = payload;
    return next();
};

const validateUserProfileUpdate = (req, res, next) => {
    const { errors, payload } = validateUserUpdatePayload(req.body || {});
    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, errors);
    }
    req.validatedBody = payload;
    return next();
};

const validateStudentCreate = (req, res, next) => {
    const { errors, payload } = validateStudentPayload(req.body || {}, { partial: false });
    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, errors);
    }
    req.validatedBody = payload;
    return next();
};

const validateStudentUpdate = (req, res, next) => {
    const { errors, payload } = validateStudentPayload(req.body || {}, { partial: true });
    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, errors);
    }
    req.validatedBody = payload;
    return next();
};

const validateTeacherCreate = (req, res, next) => {
    const { errors, payload } = validateTeacherPayload(req.body || {}, { partial: false });
    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, errors);
    }
    req.validatedBody = payload;
    return next();
};

const validateTeacherUpdate = (req, res, next) => {
    const { errors, payload } = validateTeacherPayload(req.body || {}, { partial: true });
    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, errors);
    }
    req.validatedBody = payload;
    return next();
};

module.exports = {
    validateParamId,
    validateStudentCreate,
    validateStudentUpdate,
    validateTeacherCreate,
    validateTeacherUpdate,
    validateUserProfileUpdate,
    validateUserRegister,
};
