const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { verifyToken } = require("../utils/security");

const protect = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
        throw new AppError("Authentication token missing.", 401);
    }

    const decoded = verifyToken(token, process.env.JWT_SECRET);
    if (!decoded?.userId) {
        throw new AppError("Invalid or expired authentication token.", 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        throw new AppError("User for token no longer exists.", 401);
    }

    req.user = {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name
    };

    next();
});

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError("You are not allowed to perform this action.", 403));
        }

        next();
    };
};

module.exports = {
    protect,
    authorize
};
