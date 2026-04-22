const express = require("express");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { protect } = require("../middlewares/auth");
const { isValidObjectId, normalizeDate, requireFields } = require("../utils/validate");

const router = express.Router();

const ADMIN_ROLES = ["Warden"];
const LEAVE_STATUSES = ["Pending", "Approved", "Rejected"];

const ensureStudent = async (studentId) => {
    if (!isValidObjectId(studentId)) {
        throw new AppError("Invalid student id.", 400);
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "Student") {
        throw new AppError("Student not found.", 404);
    }

    return student;
};

const parseLeaveRange = (fromValue, toValue) => {
    const fromDate = normalizeDate(fromValue);
    const toDate = normalizeDate(toValue);

    if (!fromDate || !toDate) {
        throw new AppError("Invalid leave date format.", 400);
    }

    if (toDate < fromDate) {
        throw new AppError("To date cannot be before from date.", 400);
    }

    return { fromDate, toDate };
};

router.post("/", protect, asyncHandler(async (req, res) => {
    if (req.user.role !== "Student") {
        throw new AppError("Only students can create leave requests.", 403);
    }

    const missingFields = requireFields(req.body, ["from_date", "to_date", "reason"]);
    if (missingFields.length > 0) {
        throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    const studentId = req.user.id;
    await ensureStudent(studentId);

    const { fromDate, toDate } = parseLeaveRange(req.body.from_date, req.body.to_date);
    const reason = `${req.body.reason || ""}`.trim();
    if (reason.length < 10) {
        throw new AppError("Reason must be at least 10 characters long.", 400);
    }

    const created = await LeaveRequest.create({
        student_id: studentId,
        from_date: fromDate,
        to_date: toDate,
        reason
    });

    const leave = await LeaveRequest.findById(created._id)
        .populate("student_id", "name email role room_id")
        .populate("reviewed_by", "name email role");

    res.status(201).json({
        success: true,
        message: "Leave request created successfully.",
        data: leave
    });
}));

router.get("/", protect, asyncHandler(async (req, res) => {
    const filter = {};

    if (req.user.role === "Student") {
        filter.student_id = req.user.id;
    } else if (req.query.student_id) {
        await ensureStudent(req.query.student_id);
        filter.student_id = req.query.student_id;
    }

    if (req.query.status) {
        if (!LEAVE_STATUSES.includes(req.query.status)) {
            throw new AppError(`Invalid status filter. Allowed values: ${LEAVE_STATUSES.join(", ")}`, 400);
        }
        filter.status = req.query.status;
    }

    if (req.query.from || req.query.to) {
        filter.from_date = {};
        if (req.query.from) {
            const fromDate = normalizeDate(req.query.from);
            if (!fromDate) {
                throw new AppError("Invalid from date filter.", 400);
            }
            filter.from_date.$gte = fromDate;
        }
        if (req.query.to) {
            const toDate = normalizeDate(req.query.to);
            if (!toDate) {
                throw new AppError("Invalid to date filter.", 400);
            }
            filter.from_date.$lte = toDate;
        }
    }

    const leaves = await LeaveRequest.find(filter)
        .populate("student_id", "name email role room_id")
        .populate("reviewed_by", "name email role")
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: leaves.length,
        data: leaves
    });
}));

router.get("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid leave request id.", 400);
    }

    const leave = await LeaveRequest.findById(req.params.id)
        .populate("student_id", "name email role room_id")
        .populate("reviewed_by", "name email role");

    if (!leave) {
        throw new AppError("Leave request not found.", 404);
    }

    if (req.user.role === "Student" && leave.student_id._id.toString() !== req.user.id) {
        throw new AppError("You can only access your own leave requests.", 403);
    }

    res.json({
        success: true,
        data: leave
    });
}));

router.put("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid leave request id.", 400);
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
        throw new AppError("Leave request not found.", 404);
    }

    if (req.user.role === "Student") {
        if (leave.student_id.toString() !== req.user.id) {
            throw new AppError("You can only update your own leave requests.", 403);
        }
        if (leave.status !== "Pending") {
            throw new AppError("Only pending leave requests can be updated by students.", 400);
        }

        const allowedFields = ["from_date", "to_date", "reason"];
        for (const key of Object.keys(req.body)) {
            if (!allowedFields.includes(key)) {
                throw new AppError(`Field "${key}" is not allowed in update.`, 400);
            }
        }

        if (req.body.from_date !== undefined || req.body.to_date !== undefined) {
            const fromValue = req.body.from_date !== undefined ? req.body.from_date : leave.from_date;
            const toValue = req.body.to_date !== undefined ? req.body.to_date : leave.to_date;
            const { fromDate, toDate } = parseLeaveRange(fromValue, toValue);
            leave.from_date = fromDate;
            leave.to_date = toDate;
        }

        if (req.body.reason !== undefined) {
            const reason = `${req.body.reason || ""}`.trim();
            if (reason.length < 10) {
                throw new AppError("Reason must be at least 10 characters long.", 400);
            }
            leave.reason = reason;
        }
    } else if (ADMIN_ROLES.includes(req.user.role)) {
        const allowedFields = ["status", "review_note"];
        for (const key of Object.keys(req.body)) {
            if (!allowedFields.includes(key)) {
                throw new AppError(`Field "${key}" is not allowed in update.`, 400);
            }
        }

        if (req.body.status !== undefined) {
            if (!LEAVE_STATUSES.includes(req.body.status)) {
                throw new AppError(`Invalid status. Allowed values: ${LEAVE_STATUSES.join(", ")}`, 400);
            }
            leave.status = req.body.status;
            leave.reviewed_by = req.user.id;
        }

        if (req.body.review_note !== undefined) {
            leave.review_note = `${req.body.review_note || ""}`.trim();
            if (!leave.reviewed_by) {
                leave.reviewed_by = req.user.id;
            }
        }
    } else {
        throw new AppError("You are not allowed to update this leave request.", 403);
    }

    await leave.save();

    const updated = await LeaveRequest.findById(leave._id)
        .populate("student_id", "name email role room_id")
        .populate("reviewed_by", "name email role");

    res.json({
        success: true,
        message: "Leave request updated successfully.",
        data: updated
    });
}));

router.delete("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid leave request id.", 400);
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
        throw new AppError("Leave request not found.", 404);
    }

    if (req.user.role === "Student") {
        if (leave.student_id.toString() !== req.user.id) {
            throw new AppError("You can only delete your own leave requests.", 403);
        }
        if (leave.status !== "Pending") {
            throw new AppError("Only pending leave requests can be deleted by students.", 400);
        }
    } else if (!ADMIN_ROLES.includes(req.user.role)) {
        throw new AppError("You are not allowed to delete this leave request.", 403);
    }

    await leave.deleteOne();

    res.json({
        success: true,
        message: "Leave request deleted successfully."
    });
}));

module.exports = router;
