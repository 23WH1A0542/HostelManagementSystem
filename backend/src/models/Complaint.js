const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    complaint_type: {
        type: String,
        enum: ["Room", "Mess", "Water", "Electricity"],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Resolved"],
        default: "Pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);
