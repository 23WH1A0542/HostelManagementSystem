const AppError = require("../utils/appError");

const notFound = (req, res, next) => {
    next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof AppError)) {
        error = new AppError(error.message || "Internal server error.", error.statusCode || 500);
    }

    if (err.name === "ValidationError") {
        const message = Object.values(err.errors)
            .map((value) => value.message)
            .join(", ");
        error = new AppError(message || "Validation failed.", 400);
    }

    if (err.code === 11000) {
        const duplicateField = Object.keys(err.keyValue || {})[0] || "field";
        error = new AppError(`Duplicate value for ${duplicateField}.`, 409);
    }

    if (err.name === "CastError") {
        error = new AppError(`Invalid value for ${err.path}.`, 400);
    }

    const payload = {
        success: false,
        message: error.message
    };

    if (process.env.NODE_ENV === "development") {
        payload.stack = err.stack;
    }

    res.status(error.statusCode).json(payload);
};

module.exports = {
    notFound,
    errorHandler
};
