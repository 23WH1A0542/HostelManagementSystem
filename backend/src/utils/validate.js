const mongoose = require("mongoose");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const requireFields = (source, fields) => {
    return fields.filter((field) => {
        const value = source?.[field];
        return value === undefined || value === null || `${value}`.trim() === "";
    });
};

const normalizeDate = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setUTCHours(0, 0, 0, 0);
    return date;
};

module.exports = {
    isValidObjectId,
    normalizeDate,
    requireFields
};
