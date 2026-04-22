const mongoose = require("mongoose");

const USER_ROLES = ["Student", "Warden"];

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
    },
    role: {
        type: String,
        enum: USER_ROLES,
        required: true
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        default: null
    }
}, { timestamps: true });

userSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
    }
});

userSchema.set("toObject", {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
    }
});

userSchema.statics.roles = USER_ROLES;

module.exports = mongoose.model("User", userSchema);
