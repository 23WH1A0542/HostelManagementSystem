const express = require("express");
const router = express.Router();
const Room = require("../models/Room");

// Create Room
router.post("/", async (req, res) => {
    try {
        const room = await Room.create(req.body);
        res.status(201).json(room);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get All Rooms
router.get("/", async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
