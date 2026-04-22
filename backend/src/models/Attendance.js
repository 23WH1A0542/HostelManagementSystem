const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["Present", "Absent"],
        required: true
    },
    marked_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

attendanceSchema.pre("validate", function () {
    if (this.date) {
        const normalizedDate = new Date(this.date);
        normalizedDate.setUTCHours(0, 0, 0, 0);
        this.date = normalizedDate;
    }
});

attendanceSchema.index({ student_id: 1, date: 1 }, { unique: true });

attendanceSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Attendance", attendanceSchema);
