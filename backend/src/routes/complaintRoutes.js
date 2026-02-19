const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");

// Create Complaint
router.post("/", async (req, res) => {
    try {
        const complaint = await Complaint.create(req.body);
        res.status(201).json(complaint);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get Complaints
router.get("/", async (req, res) => {
    try {
        const complaints = await Complaint.find().populate("student_id");
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
