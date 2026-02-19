const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");

// Mark Attendance
router.post("/", async (req, res) => {
    try {
        const record = await Attendance.create(req.body);
        res.status(201).json(record);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get Attendance
router.get("/", async (req, res) => {
    try {
        const records = await Attendance.find().populate("student_id");
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
