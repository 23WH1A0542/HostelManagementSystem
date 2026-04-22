const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    room_number: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true
    },
    floor: {
        type: Number,
        required: true,
        min: 0
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    occupied_count: {
        type: Number,
        default: 0,
        min: 0
    },
    occupants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

roomSchema.pre("validate", function () {
    if (Array.isArray(this.occupants)) {
        this.occupied_count = this.occupants.length;
    }
});

roomSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Room", roomSchema);
