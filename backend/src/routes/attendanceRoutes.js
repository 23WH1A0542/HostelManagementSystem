const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { protect, authorize } = require("../middlewares/auth");
const { isValidObjectId, normalizeDate, requireFields } = require("../utils/validate");

const router = express.Router();

const ADMIN_ROLES = ["Warden"];
const ATTENDANCE_STATUSES = ["Present", "Absent"];

router.post("/", protect, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["student_id", "status"]);
    if (missingFields.length > 0) {
        throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    if (!isValidObjectId(req.body.student_id)) {
        throw new AppError("Invalid student id.", 400);
    }

    if (!ATTENDANCE_STATUSES.includes(req.body.status)) {
        throw new AppError(`Invalid status. Allowed values: ${ATTENDANCE_STATUSES.join(", ")}`, 400);
    }

    const student = await User.findById(req.body.student_id);
    if (!student || student.role !== "Student") {
        throw new AppError("Student not found.", 404);
    }

    const date = normalizeDate(req.body.date);
    if (!date) {
        throw new AppError("Invalid date format.", 400);
    }

    const record = await Attendance.findOneAndUpdate(
        {
            student_id: req.body.student_id,
            date
        },
        {
            student_id: req.body.student_id,
            date,
            status: req.body.status,
            marked_by: req.user.id
        },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    )
        .populate("student_id", "name email role")
        .populate("marked_by", "name email role");

    res.json({
        success: true,
        message: "Attendance marked successfully.",
        data: record
    });
}));

router.get("/", protect, asyncHandler(async (req, res) => {
    const filter = {};

    if (req.user.role === "Student") {
        filter.student_id = req.user.id;
    } else if (req.query.student_id) {
        if (!isValidObjectId(req.query.student_id)) {
            throw new AppError("Invalid student id.", 400);
        }
        filter.student_id = req.query.student_id;
    }

    if (req.query.status) {
        if (!ATTENDANCE_STATUSES.includes(req.query.status)) {
            throw new AppError(`Invalid status filter. Allowed values: ${ATTENDANCE_STATUSES.join(", ")}`, 400);
        }
        filter.status = req.query.status;
    }

    if (req.query.date) {
        const date = normalizeDate(req.query.date);
        if (!date) {
            throw new AppError("Invalid date filter.", 400);
        }
        filter.date = date;
    }

    if (req.query.from || req.query.to) {
        filter.date = {};

        if (req.query.from) {
            const fromDate = normalizeDate(req.query.from);
            if (!fromDate) {
                throw new AppError("Invalid from date.", 400);
            }
            filter.date.$gte = fromDate;
        }

        if (req.query.to) {
            const toDate = normalizeDate(req.query.to);
            if (!toDate) {
                throw new AppError("Invalid to date.", 400);
            }
            filter.date.$lte = toDate;
        }
    }

    const records = await Attendance.find(filter)
        .populate("student_id", "name email role")
        .populate("marked_by", "name email role")
        .sort({ date: -1, createdAt: -1 });

    res.json({
        success: true,
        count: records.length,
        data: records
    });
}));

router.get("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid attendance id.", 400);
    }

    const record = await Attendance.findById(req.params.id)
        .populate("student_id", "name email role")
        .populate("marked_by", "name email role");

    if (!record) {
        throw new AppError("Attendance record not found.", 404);
    }

    if (req.user.role === "Student" && record.student_id._id.toString() !== req.user.id) {
        throw new AppError("You can only view your own attendance.", 403);
    }

    res.json({
        success: true,
        data: record
    });
}));

router.put("/:id", protect, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid attendance id.", 400);
    }

    const record = await Attendance.findById(req.params.id);
    if (!record) {
        throw new AppError("Attendance record not found.", 404);
    }

    const allowedFields = ["status", "date"];
    for (const key of Object.keys(req.body)) {
        if (!allowedFields.includes(key)) {
            throw new AppError(`Field "${key}" is not allowed in update.`, 400);
        }
    }

    if (req.body.status !== undefined) {
        if (!ATTENDANCE_STATUSES.includes(req.body.status)) {
            throw new AppError(`Invalid status. Allowed values: ${ATTENDANCE_STATUSES.join(", ")}`, 400);
        }
        record.status = req.body.status;
    }

    if (req.body.date !== undefined) {
        const date = normalizeDate(req.body.date);
        if (!date) {
            throw new AppError("Invalid date format.", 400);
        }
        record.date = date;
    }

    record.marked_by = req.user.id;

    await record.save();

    const updatedRecord = await Attendance.findById(record._id)
        .populate("student_id", "name email role")
        .populate("marked_by", "name email role");

    res.json({
        success: true,
        message: "Attendance updated successfully.",
        data: updatedRecord
    });
}));

router.delete("/:id", protect, authorize("Warden"), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid attendance id.", 400);
    }

    const record = await Attendance.findById(req.params.id);
    if (!record) {
        throw new AppError("Attendance record not found.", 404);
    }

    await record.deleteOne();

    res.json({
        success: true,
        message: "Attendance record deleted successfully."
    });
}));

module.exports = router;
