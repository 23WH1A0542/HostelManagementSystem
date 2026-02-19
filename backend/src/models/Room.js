const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    room_number: {
        type: String,
        required: true
    },
    floor: {
        type: Number,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    occupied_count: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model("Room", roomSchema);
