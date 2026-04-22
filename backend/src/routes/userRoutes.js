const express = require("express");
const User = require("../models/User");
const Room = require("../models/Room");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { protect, authorize } = require("../middlewares/auth");
const {
    DEFAULT_TOKEN_TTL_SECONDS,
    hashPassword,
    signToken,
    verifyPassword
} = require("../utils/security");
const { isValidObjectId, requireFields } = require("../utils/validate");

const router = express.Router();

const ADMIN_ROLES = ["Warden"];

const createAuthToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new AppError("JWT_SECRET is missing in environment variables.", 500);
    }

    const ttl = Number(process.env.TOKEN_TTL_SECONDS) || DEFAULT_TOKEN_TTL_SECONDS;
    return signToken(
        {
            userId: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET,
        ttl
    );
};

const parseRole = (value) => (typeof value === "string" ? value.trim() : "");
const countWardens = async (excludeUserId) => {
    const filter = { role: "Warden" };
    if (excludeUserId) {
        filter._id = { $ne: excludeUserId };
    }
    return User.countDocuments(filter);
};

router.post("/register", asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["name", "email", "password", "role"]);
    if (missingFields.length > 0) {
        throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    const role = parseRole(req.body.role);
    if (!User.roles.includes(role)) {
        throw new AppError(`Invalid role. Allowed roles: ${User.roles.join(", ")}`, 400);
    }
    if (role === "Warden" && (await countWardens()) > 0) {
        throw new AppError("Only one warden account is allowed.", 409);
    }

    const email = req.body.email.trim().toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError("User already exists with this email.", 409);
    }

    if (`${req.body.password}`.length < 8) {
        throw new AppError("Password must be at least 8 characters long.", 400);
    }

    const hashedPassword = await hashPassword(req.body.password);

    const user = await User.create({
        name: req.body.name,
        email,
        password: hashedPassword,
        role
    });

    const token = createAuthToken(user);

    res.status(201).json({
        success: true,
        message: "User registered successfully.",
        token,
        data: user
    });
}));

router.post("/login", asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["email", "password"]);
    if (missingFields.length > 0) {
        throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await verifyPassword(req.body.password, user.password))) {
        throw new AppError("Invalid email or password.", 401);
    }

    const token = createAuthToken(user);
    const safeUser = await User.findById(user._id).populate("room_id", "room_number floor capacity occupied_count");

    res.json({
        success: true,
        message: "Login successful.",
        token,
        data: safeUser
    });
}));

router.get("/profile", protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate("room_id", "room_number floor capacity occupied_count");
    if (!user) {
        throw new AppError("User not found.", 404);
    }

    res.json({
        success: true,
        data: user
    });
}));

router.get("/", protect, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.role) {
        const role = parseRole(req.query.role);
        if (!User.roles.includes(role)) {
            throw new AppError(`Invalid role filter. Allowed roles: ${User.roles.join(", ")}`, 400);
        }
        filter.role = role;
    }

    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search.trim(), "i");
        filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const users = await User.find(filter)
        .populate("room_id", "room_number floor capacity occupied_count")
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: users.length,
        data: users
    });
}));

router.get("/:id", protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        throw new AppError("Invalid user id.", 400);
    }

    if (req.user.role === "Student" && req.user.id !== id) {
        throw new AppError("You can only access your own profile.", 403);
    }

    const user = await User.findById(id).populate("room_id", "room_number floor capacity occupied_count");
    if (!user) {
        throw new AppError("User not found.", 404);
    }

    res.json({
        success: true,
        data: user
    });
}));

router.put("/:id", protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        throw new AppError("Invalid user id.", 400);
    }

    if (req.user.role === "Student" && req.user.id !== id) {
        throw new AppError("You can only update your own account.", 403);
    }

    const user = await User.findById(id).select("+password");
    if (!user) {
        throw new AppError("User not found.", 404);
    }

    const allowedFields = req.user.role === "Student"
        ? ["name", "email", "password"]
        : ["name", "email", "password", "role"];

    for (const key of Object.keys(req.body)) {
        if (!allowedFields.includes(key)) {
            throw new AppError(`Field "${key}" is not allowed in update.`, 400);
        }
    }

    if (req.body.role !== undefined) {
        if (req.user.role !== "Warden") {
            throw new AppError("Only Warden can change roles.", 403);
        }

        const role = parseRole(req.body.role);
        if (!User.roles.includes(role)) {
            throw new AppError(`Invalid role. Allowed roles: ${User.roles.join(", ")}`, 400);
        }

        if (role === "Warden" && user.role !== "Warden" && (await countWardens(user._id)) > 0) {
            throw new AppError("Only one warden account is allowed.", 409);
        }

        if (user.role === "Warden" && role !== "Warden" && (await countWardens(user._id)) === 0) {
            throw new AppError("Cannot change role of the only warden account.", 400);
        }

        user.role = role;
    }

    if (req.body.name !== undefined) {
        user.name = req.body.name;
    }

    if (req.body.email !== undefined) {
        const email = req.body.email.trim().toLowerCase();
        const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
        if (existingUser) {
            throw new AppError("Another user already exists with this email.", 409);
        }
        user.email = email;
    }

    if (req.body.password !== undefined) {
        if (`${req.body.password}`.length < 8) {
            throw new AppError("Password must be at least 8 characters long.", 400);
        }
        user.password = await hashPassword(req.body.password);
    }

    await user.save();

    const updatedUser = await User.findById(id).populate("room_id", "room_number floor capacity occupied_count");

    res.json({
        success: true,
        message: "User updated successfully.",
        data: updatedUser
    });
}));

router.delete("/:id", protect, authorize("Warden"), asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        throw new AppError("Invalid user id.", 400);
    }

    if (req.user.id === id) {
        throw new AppError("You cannot delete your own account.", 400);
    }

    const user = await User.findById(id);
    if (!user) {
        throw new AppError("User not found.", 404);
    }
    if (user.role === "Warden" && (await countWardens(user._id)) === 0) {
        throw new AppError("Cannot delete the only warden account.", 400);
    }

    if (user.room_id) {
        await Room.findByIdAndUpdate(user.room_id, {
            $pull: { occupants: user._id }
        });

        const room = await Room.findById(user.room_id);
        if (room) {
            room.occupied_count = room.occupants.length;
            await room.save();
        }
    }

    await user.deleteOne();

    res.json({
        success: true,
        message: "User deleted successfully."
    });
}));

module.exports = router;
