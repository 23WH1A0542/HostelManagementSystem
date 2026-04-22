const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true,
        trim: true
    },
    priority: {
        type: String,
        enum: ["Normal", "Important", "Urgent"],
        default: "Normal"
    },
    target_role: {
        type: String,
        enum: ["All", "Student", "Warden"],
        default: "All"
    },
    publish_date: {
        type: Date,
        default: Date.now
    },
    expires_at: {
        type: Date,
        default: null
    },
    is_active: {
        type: Boolean,
        default: true
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

noticeSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Notice", noticeSchema);
