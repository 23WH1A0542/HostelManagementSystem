const express = require("express");
const Room = require("../models/Room");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { protect, authorize } = require("../middlewares/auth");
const { isValidObjectId, requireFields } = require("../utils/validate");

const router = express.Router();

const ADMIN_ROLES = ["Warden"];

router.post("/", protect, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["room_number", "floor", "capacity"]);
    if (missingFields.length > 0) {
        throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    const room = await Room.create({
        room_number: req.body.room_number,
        floor: req.body.floor,
        capacity: req.body.capacity,
        occupants: []
    });

    res.status(201).json({
        success: true,
        message: "Room created successfully.",
        data: room
    });
}));

router.get("/", protect, asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.floor !== undefined) {
        filter.floor = Number(req.query.floor);
    }

    const rooms = await Room.find(filter)
        .populate("occupants", "name email role")
        .sort({ floor: 1, room_number: 1 });

    res.json({
        success: true,
        count: rooms.length,
        data: rooms
    });
}));

router.get("/:id", protect, asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid room id.", 400);
    }

    const room = await Room.findById(req.params.id).populate("occupants", "name email role room_id");
    if (!room) {
        throw new AppError("Room not found.", 404);
    }

    res.json({
        success: true,
        data: room
    });
}));

router.put("/:id", protect, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid room id.", 400);
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
        throw new AppError("Room not found.", 404);
    }

    const allowedFields = ["room_number", "floor", "capacity"];
    for (const key of Object.keys(req.body)) {
        if (!allowedFields.includes(key)) {
            throw new AppError(`Field "${key}" is not allowed in update.`, 400);
        }
    }

    if (req.body.capacity !== undefined && Number(req.body.capacity) < room.occupied_count) {
        throw new AppError("Capacity cannot be lower than current occupied count.", 400);
    }

    if (req.body.room_number !== undefined) {
        room.room_number = req.body.room_number;
    }
    if (req.body.floor !== undefined) {
        room.floor = req.body.floor;
    }
    if (req.body.capacity !== undefined) {
        room.capacity = req.body.capacity;
    }

    await room.save();

    res.json({
        success: true,
        message: "Room updated successfully.",
        data: room
    });
}));

router.delete("/:id", protect, authorize("Warden"), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        throw new AppError("Invalid room id.", 400);
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
        throw new AppError("Room not found.", 404);
    }

    if (room.occupied_count > 0) {
        throw new AppError("Cannot delete room while students are allocated.", 400);
    }

    await room.deleteOne();

    res.json({
        success: true,
        message: "Room deleted successfully."
    });
}));

router.post("/:id/allocate", protect, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { student_id: studentId } = req.body;

    if (!isValidObjectId(id)) {
        throw new AppError("Invalid room id.", 400);
    }

    if (!isValidObjectId(studentId)) {
        throw new AppError("Invalid student id.", 400);
    }

    const room = await Room.findById(id);
    if (!room) {
        throw new AppError("Room not found.", 404);
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "Student") {
        throw new AppError("Student not found.", 404);
    }

    if (student.room_id) {
        throw new AppError("Student is already allocated to another room.", 400);
    }

    if (room.occupied_count >= room.capacity) {
        throw new AppError("Room is already at full capacity.", 400);
    }

    room.occupants.push(student._id);
    room.occupied_count = room.occupants.length;
    student.room_id = room._id;

    await Promise.all([room.save(), student.save()]);

    const updatedRoom = await Room.findById(room._id).populate("occupants", "name email role");

    res.json({
        success: true,
        message: "Student allocated successfully.",
        data: updatedRoom
    });
}));

router.post("/:id/deallocate", protect, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { student_id: studentId } = req.body;

    if (!isValidObjectId(id)) {
        throw new AppError("Invalid room id.", 400);
    }

    if (!isValidObjectId(studentId)) {
        throw new AppError("Invalid student id.", 400);
    }

    const room = await Room.findById(id);
    if (!room) {
        throw new AppError("Room not found.", 404);
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "Student") {
        throw new AppError("Student not found.", 404);
    }

    const isInRoom = room.occupants.some((occupantId) => occupantId.toString() === studentId);
    if (!isInRoom || !student.room_id || student.room_id.toString() !== room._id.toString()) {
        throw new AppError("Student is not allocated to this room.", 400);
    }

    room.occupants = room.occupants.filter((occupantId) => occupantId.toString() !== studentId);
    room.occupied_count = room.occupants.length;
    student.room_id = null;

    await Promise.all([room.save(), student.save()]);

    const updatedRoom = await Room.findById(room._id).populate("occupants", "name email role");

    res.json({
        success: true,
        message: "Student deallocated successfully.",
        data: updatedRoom
    });
}));

module.exports = router;
