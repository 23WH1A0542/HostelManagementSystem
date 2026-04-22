const express = require("express");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { protect } = require("../middlewares/auth");
const { isValidObjectId, requireFields } = require("../utils/validate");

const router = express.Router();

const ADMIN_ROLES = ["Warden"];
const COMPLAINT_TYPES = ["Room", "Mess", "Water", "Electricity", "Security", "Other"];
const COMPLAINT_STATUSES = ["Pending", "In Progress", "Resolved"];

router.post("/", protect, asyncHandler(async (req, res) => {
    if (req.user.role !== "Student") {
        throw new AppError("Only students can create complaints.", 403);
    }

    const missingFields = requireFields(req.body, ["complaint_type", "description"]);
    if (missingFields.length > 0) {
        throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    if (!COMPLAINT_TYPES.includes(req.body.complaint_type)) {
        throw new AppError(`Invalid complaint type. Allowed values: ${COMPLAINT_TYPES.join(", ")}`, 400);
    }

    const studentId = req.user.id;
    if (!isValidObjectId(studentId)) {
        throw new AppError("Invalid student id.", 400);
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "Student") {
        throw new AppError("Student not found.", 404);
    }

    const complaint = await Complaint.create({
        student_id: studentId,
        complaint_type: req.body.complaint_type,
        description: req.body.description
    });

    const createdComplaint = await Complaint.findById(complaint._id)
        .populate("student_id", "name email role")
        .populate("assigned_to", "name email role");

    res.status(201).json({
        success: true,
        message: "Complaint created successfully.",
        data: createdComplaint
    });
}));

router.get("/", protect, asyncHandler(async (req, res) => {
    const filter = {};

    if (req.user.role === "Student") {
        filter.student_id = req.user.id;
    } else if (req.query.student_id) {
        if (!isValidObjectId(req.query.student_id)) {
            throw new AppError("Invalid student id filter.", 400);
        }
        filter.student_id = req.query.student_id;
    }

    if (req.query.status) {
        if (!COMPLAINT_STATUSES.includes(req.query.status)) {
            throw new AppError(`Invalid status filter. Allowed values: ${COMPLAINT_STATUSES.join(", ")}`, 400);
        }
        filter.status = req.query.status;
    }

    if (req.query.complaint_type) {
        if (!COMPLAINT_TYPES.includes(req.query.complaint_type)) {
            throw new AppError(`Invalid complaint type filter. Allowed values: ${COMPLAINT_TYPES.join(", ")}`, 400);
        }
        filter.complaint_type = req.query.complaint_type;
    }

    const complaints = await Complaint.find(filter)
        .populate("student_id", "name email role")
        .populate("assigned_to", "name email role")
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: complaints.length,
        data: complaints
    });
}));

router.get("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid complaint id.", 400);
    }

    const complaint = await Complaint.findById(req.params.id)
        .populate("student_id", "name email role")
        .populate("assigned_to", "name email role");

    if (!complaint) {
        throw new AppError("Complaint not found.", 404);
    }

    if (req.user.role === "Student" && complaint.student_id._id.toString() !== req.user.id) {
        throw new AppError("You can only access your own complaints.", 403);
    }

    res.json({
        success: true,
        data: complaint
    });
}));

router.put("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid complaint id.", 400);
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
        throw new AppError("Complaint not found.", 404);
    }

    if (req.user.role === "Student") {
        if (complaint.student_id.toString() !== req.user.id) {
            throw new AppError("You can only update your own complaints.", 403);
        }

        if (complaint.status !== "Pending") {
            throw new AppError("Only pending complaints can be updated by students.", 400);
        }

        const allowedFields = ["complaint_type", "description"];
        for (const key of Object.keys(req.body)) {
            if (!allowedFields.includes(key)) {
                throw new AppError(`Field "${key}" is not allowed in update.`, 400);
            }
        }
    } else if (!ADMIN_ROLES.includes(req.user.role)) {
        throw new AppError("You are not allowed to update this complaint.", 403);
    }

    if (req.body.complaint_type !== undefined) {
        if (!COMPLAINT_TYPES.includes(req.body.complaint_type)) {
            throw new AppError(`Invalid complaint type. Allowed values: ${COMPLAINT_TYPES.join(", ")}`, 400);
        }
        complaint.complaint_type = req.body.complaint_type;
    }

    if (req.body.description !== undefined) {
        complaint.description = req.body.description;
    }

    if (req.body.status !== undefined) {
        if (!ADMIN_ROLES.includes(req.user.role)) {
            throw new AppError("Only warden roles can update complaint status.", 403);
        }

        if (!COMPLAINT_STATUSES.includes(req.body.status)) {
            throw new AppError(`Invalid status. Allowed values: ${COMPLAINT_STATUSES.join(", ")}`, 400);
        }
        complaint.status = req.body.status;
    }

    if (req.body.assigned_to !== undefined) {
        if (!ADMIN_ROLES.includes(req.user.role)) {
            throw new AppError("Only warden roles can assign complaints.", 403);
        }

        if (!isValidObjectId(req.body.assigned_to)) {
            throw new AppError("Invalid assigned_to user id.", 400);
        }

        const assignee = await User.findById(req.body.assigned_to);
        if (!assignee || !ADMIN_ROLES.includes(assignee.role)) {
            throw new AppError("Assigned user must be Warden.", 400);
        }

        complaint.assigned_to = assignee._id;
    }

    if (req.body.resolution_note !== undefined) {
        if (!ADMIN_ROLES.includes(req.user.role)) {
            throw new AppError("Only warden roles can update resolution notes.", 403);
        }
        complaint.resolution_note = req.body.resolution_note;
    }

    await complaint.save();

    const updatedComplaint = await Complaint.findById(complaint._id)
        .populate("student_id", "name email role")
        .populate("assigned_to", "name email role");

    res.json({
        success: true,
        message: "Complaint updated successfully.",
        data: updatedComplaint
    });
}));

router.delete("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid complaint id.", 400);
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
        throw new AppError("Complaint not found.", 404);
    }

    if (req.user.role === "Student") {
        if (complaint.student_id.toString() !== req.user.id) {
            throw new AppError("You can only delete your own complaints.", 403);
        }

        if (complaint.status !== "Pending") {
            throw new AppError("Only pending complaints can be deleted by students.", 400);
        }
    } else if (!ADMIN_ROLES.includes(req.user.role)) {
        throw new AppError("You are not allowed to delete this complaint.", 403);
    }

    await complaint.deleteOne();

    res.json({
        success: true,
        message: "Complaint deleted successfully."
    });
}));

module.exports = router;
