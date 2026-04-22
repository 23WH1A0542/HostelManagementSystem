const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    from_date: {
        type: Date,
        required: true
    },
    to_date: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    review_note: {
        type: String,
        trim: true,
        default: ""
    }
}, { timestamps: true });

leaveRequestSchema.pre("validate", function () {
    if (this.from_date) {
        const start = new Date(this.from_date);
        start.setUTCHours(0, 0, 0, 0);
        this.from_date = start;
    }

    if (this.to_date) {
        const end = new Date(this.to_date);
        end.setUTCHours(0, 0, 0, 0);
        this.to_date = end;
    }
});

leaveRequestSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
