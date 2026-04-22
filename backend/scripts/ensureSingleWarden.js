const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../src/utils/db");
const User = require("../src/models/User");
const Complaint = require("../src/models/Complaint");
const LeaveRequest = require("../src/models/LeaveRequest");
const Notice = require("../src/models/Notice");
const { hashPassword } = require("../src/utils/security");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const run = async () => {
    try {
        await connectDB();

        const preferredEmail = (process.env.PRIMARY_WARDEN_EMAIL || "warden1@gmail.com").trim().toLowerCase();
        const preferredName = (process.env.PRIMARY_WARDEN_NAME || "Warden1").trim();
        const preferredPassword = process.env.PRIMARY_WARDEN_PASSWORD || "12345678";
        const existingWardens = await User.find({ role: "Warden" }).sort({ createdAt: 1 });
        let preferredUser = await User.findOne({ email: preferredEmail }).select("+password");

        let keeper = null;

        if (preferredUser) {
            keeper = preferredUser;
            const password = await hashPassword(preferredPassword);
            keeper.password = password;
            keeper.name = preferredName;
            keeper.role = "Warden";
            await keeper.save();
        } else {
            const password = await hashPassword(preferredPassword);
            keeper = await User.create({
                name: preferredName,
                email: preferredEmail,
                password,
                role: "Warden"
            });
            preferredUser = keeper;
        }

        const demoted = await User.find({
            role: "Warden",
            _id: { $ne: keeper._id }
        });
        const demotedIds = demoted.map((entry) => entry._id);

        if (demotedIds.length > 0) {
            await User.updateMany(
                { _id: { $in: demotedIds } },
                { $set: { role: "Student" } }
            );

            await Complaint.updateMany(
                { assigned_to: { $in: demotedIds } },
                { $set: { assigned_to: keeper._id } }
            );

            await LeaveRequest.updateMany(
                { reviewed_by: { $in: demotedIds } },
                { $set: { reviewed_by: keeper._id } }
            );

            await Notice.updateMany(
                { created_by: { $in: demotedIds } },
                { $set: { created_by: keeper._id } }
            );
        }

        const finalCount = await User.countDocuments({ role: "Warden" });
        console.log(`WARDEN_KEEPER_EMAIL=${keeper.email}`);
        console.log(`DEMOTED_WARDENS=${demotedIds.length}`);
        console.log(`FINAL_WARDEN_COUNT=${finalCount}`);
    } catch (error) {
        console.error("ENSURE_SINGLE_WARDEN_FAILED", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

run();
