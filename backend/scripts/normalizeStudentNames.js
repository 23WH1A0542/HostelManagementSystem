const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../src/utils/db");
const User = require("../src/models/User");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const NORMAL_NAMES = [
    "Aarav Sharma",
    "Riya Patel",
    "Vikram Singh",
    "Neha Reddy",
    "Karan Mehta",
    "Isha Verma",
    "Rohan Gupta",
    "Ananya Rao",
    "Aditya Nair",
    "Sneha Kulkarni",
    "Manav Joshi",
    "Priya Iyer"
];

const PLACEHOLDER_PATTERNS = [
    /^seed student\b/i,
    /^student[\s_-]*\d+$/i,
    /^student$/i,
    /^demo student\b/i,
    /^flow student\b/i
];

const isPlaceholderName = (name) => {
    const clean = `${name || ""}`.trim();
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(clean));
};

const run = async () => {
    try {
        await connectDB();

        const students = await User.find({ role: "Student" }).sort({ createdAt: 1 });
        const targets = students.filter((student) => isPlaceholderName(student.name));

        if (targets.length === 0) {
            console.log("NO_PLACEHOLDER_STUDENT_NAMES_FOUND");
            return;
        }

        let changed = 0;
        for (let i = 0; i < targets.length; i += 1) {
            const student = targets[i];
            const baseName = NORMAL_NAMES[i % NORMAL_NAMES.length];
            const cycle = Math.floor(i / NORMAL_NAMES.length);
            const nextName = cycle === 0 ? baseName : `${baseName} ${cycle + 1}`;

            if (student.name !== nextName) {
                const oldName = student.name;
                student.name = nextName;
                await student.save();
                changed += 1;
                console.log(`RENAMED: "${oldName}" -> "${nextName}" (${student.email})`);
            }
        }

        console.log(`STUDENT_NAMES_NORMALIZED=${changed}`);
    } catch (error) {
        console.error("NORMALIZE_STUDENT_NAMES_FAILED", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

run();
