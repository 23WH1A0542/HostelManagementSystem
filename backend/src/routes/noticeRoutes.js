const express = require("express");
const Notice = require("../models/Notice");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { protect, authorize } = require("../middlewares/auth");
const { isValidObjectId, requireFields } = require("../utils/validate");

const router = express.Router();

const NOTICE_PRIORITIES = ["Normal", "Important", "Urgent"];
const TARGET_ROLES = ["All", "Student", "Warden"];

const parseDateOrNull = (value, fieldName) => {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || `${value}`.trim() === "") {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AppError(`Invalid ${fieldName}.`, 400);
    }
    return date;
};

const ensurePriority = (value) => {
    if (value !== undefined && !NOTICE_PRIORITIES.includes(value)) {
        throw new AppError(`Invalid priority. Allowed values: ${NOTICE_PRIORITIES.join(", ")}`, 400);
    }
};

const ensureTargetRole = (value) => {
    if (value !== undefined && !TARGET_ROLES.includes(value)) {
        throw new AppError(`Invalid target_role. Allowed values: ${TARGET_ROLES.join(", ")}`, 400);
    }
};

router.post("/", protect, authorize("Warden"), asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["title", "body"]);
    if (missingFields.length > 0) {
        throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    ensurePriority(req.body.priority);
    ensureTargetRole(req.body.target_role);

    const expiresAt = parseDateOrNull(req.body.expires_at, "expires_at");
    const publishDate = parseDateOrNull(req.body.publish_date, "publish_date") || new Date();

    if (expiresAt && expiresAt < publishDate) {
        throw new AppError("expires_at cannot be before publish_date.", 400);
    }

    const notice = await Notice.create({
        title: req.body.title,
        body: req.body.body,
        priority: req.body.priority || "Normal",
        target_role: req.body.target_role || "All",
        publish_date: publishDate,
        expires_at: expiresAt,
        created_by: req.user.id
    });

    const created = await Notice.findById(notice._id).populate("created_by", "name email role");

    res.status(201).json({
        success: true,
        message: "Notice published successfully.",
        data: created
    });
}));

router.get("/", protect, asyncHandler(async (req, res) => {
    const filter = {};
    const now = new Date();

    ensurePriority(req.query.priority);
    ensureTargetRole(req.query.target_role);

    if (req.query.priority) {
        filter.priority = req.query.priority;
    }

    if (req.query.target_role) {
        filter.target_role = req.query.target_role;
    }

    if (req.user.role === "Student") {
        filter.is_active = true;
        filter.target_role = filter.target_role || { $in: ["All", "Student"] };
        filter.publish_date = { $lte: now };
        filter.$or = [{ expires_at: null }, { expires_at: { $gte: now } }];
    } else {
        if (req.query.active === "true") {
            filter.is_active = true;
        } else if (req.query.active === "false") {
            filter.is_active = false;
        }
    }

    const notices = await Notice.find(filter)
        .populate("created_by", "name email role")
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: notices.length,
        data: notices
    });
}));

router.get("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid notice id.", 400);
    }

    const notice = await Notice.findById(req.params.id).populate("created_by", "name email role");
    if (!notice) {
        throw new AppError("Notice not found.", 404);
    }

    if (req.user.role === "Student") {
        const now = new Date();
        const canViewRole = notice.target_role === "All" || notice.target_role === "Student";
        const inTimeRange = notice.publish_date <= now && (!notice.expires_at || notice.expires_at >= now);
        if (!notice.is_active || !canViewRole || !inTimeRange) {
            throw new AppError("You are not allowed to access this notice.", 403);
        }
    }

    res.json({
        success: true,
        data: notice
    });
}));

router.put("/:id", protect, authorize("Warden"), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid notice id.", 400);
    }

    const notice = await Notice.findById(req.params.id);
    if (!notice) {
        throw new AppError("Notice not found.", 404);
    }

    const allowedFields = ["title", "body", "priority", "target_role", "publish_date", "expires_at", "is_active"];
    for (const key of Object.keys(req.body)) {
        if (!allowedFields.includes(key)) {
            throw new AppError(`Field "${key}" is not allowed in update.`, 400);
        }
    }

    ensurePriority(req.body.priority);
    ensureTargetRole(req.body.target_role);

    if (req.body.title !== undefined) {
        notice.title = req.body.title;
    }
    if (req.body.body !== undefined) {
        notice.body = req.body.body;
    }
    if (req.body.priority !== undefined) {
        notice.priority = req.body.priority;
    }
    if (req.body.target_role !== undefined) {
        notice.target_role = req.body.target_role;
    }
    if (req.body.publish_date !== undefined) {
        notice.publish_date = parseDateOrNull(req.body.publish_date, "publish_date");
    }
    if (req.body.expires_at !== undefined) {
        notice.expires_at = parseDateOrNull(req.body.expires_at, "expires_at");
    }
    if (req.body.is_active !== undefined) {
        notice.is_active = Boolean(req.body.is_active);
    }

    if (notice.expires_at && notice.publish_date && notice.expires_at < notice.publish_date) {
        throw new AppError("expires_at cannot be before publish_date.", 400);
    }

    await notice.save();

    const updated = await Notice.findById(notice._id).populate("created_by", "name email role");

    res.json({
        success: true,
        message: "Notice updated successfully.",
        data: updated
    });
}));

router.delete("/:id", protect, authorize("Warden"), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid notice id.", 400);
    }

    const notice = await Notice.findById(req.params.id);
    if (!notice) {
        throw new AppError("Notice not found.", 404);
    }

    await notice.deleteOne();

    res.json({
        success: true,
        message: "Notice deleted successfully."
    });
}));

module.exports = router;
