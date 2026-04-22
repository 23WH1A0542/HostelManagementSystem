const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    complaint_type: {
        type: String,
        enum: ["Room", "Mess", "Water", "Electricity", "Security", "Other"],
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Resolved"],
        default: "Pending"
    },
    assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    resolution_note: {
        type: String,
        trim: true,
        default: ""
    }
}, { timestamps: true });

complaintSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Complaint", complaintSchema);
