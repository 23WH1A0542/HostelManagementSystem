const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../src/utils/db");
const User = require("../src/models/User");
const Room = require("../src/models/Room");
const Attendance = require("../src/models/Attendance");
const Complaint = require("../src/models/Complaint");
const { hashPassword } = require("../src/utils/security");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PASSWORD = "Password123!";
const STUDENT_SEED_NAMES = [
    "Aarav Sharma",
    "Riya Patel",
    "Vikram Singh",
    "Neha Reddy",
    "Karan Mehta"
];

const createUsers = async (suffix) => {
    const password = await hashPassword(PASSWORD);

    const warden = await User.create({
        name: "Seed Warden",
        email: `warden_${suffix}@demo.com`,
        password,
        role: "Warden"
    });

    const students = [];
    for (let i = 0; i < STUDENT_SEED_NAMES.length; i += 1) {
        const name = STUDENT_SEED_NAMES[i];
        const emailPrefix = name.toLowerCase().replace(/\s+/g, ".");
        const student = await User.create({
            name,
            email: `${emailPrefix}.${suffix}@demo.com`,
            password,
            role: "Student"
        });
        students.push(student);
    }

    return { warden, students };
};

const createRoomsAndAllocation = async (suffix, students) => {
    const room1 = await Room.create({
        room_number: `A101-${suffix}`,
        floor: 1,
        capacity: 3
    });

    const room2 = await Room.create({
        room_number: `A102-${suffix}`,
        floor: 1,
        capacity: 3
    });

    const firstRoomStudents = students.slice(0, 3);
    const secondRoomStudents = students.slice(3);

    room1.occupants = firstRoomStudents.map((student) => student._id);
    room2.occupants = secondRoomStudents.map((student) => student._id);
    room1.occupied_count = room1.occupants.length;
    room2.occupied_count = room2.occupants.length;

    await Promise.all([
        room1.save(),
        room2.save(),
        ...firstRoomStudents.map((student) =>
            User.updateOne({ _id: student._id }, { $set: { room_id: room1._id } })
        ),
        ...secondRoomStudents.map((student) =>
            User.updateOne({ _id: student._id }, { $set: { room_id: room2._id } })
        )
    ]);

    return { room1, room2 };
};

const createAttendance = async (students, wardenId) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);

    const records = students.map((student, index) => ({
        student_id: student._id,
        date,
        status: index === students.length - 1 ? "Absent" : "Present",
        marked_by: wardenId
    }));

    await Attendance.insertMany(records, { ordered: true });
};

const createComplaints = async (students, wardenId) => {
    const created = await Complaint.insertMany([
        {
            student_id: students[0]._id,
            complaint_type: "Water",
            description: `Water issue in hostel for ${students[0].name}`,
            status: "In Progress",
            assigned_to: wardenId,
            resolution_note: "Maintenance team notified."
        },
        {
            student_id: students[1]._id,
            complaint_type: "Water",
            description: `Water issue in hostel for ${students[1].name}`
        },
        {
            student_id: students[2]._id,
            complaint_type: "Water",
            description: `Water issue in hostel for ${students[2].name}`
        }
    ], { ordered: true });

    return created.length;
};

const run = async () => {
    try {
        await connectDB();

        const suffix = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
        const { warden, students } = await createUsers(suffix);
        const { room1, room2 } = await createRoomsAndAllocation(suffix, students);
        await createAttendance(students, warden._id);
        const complaintsCount = await createComplaints(students, warden._id);

        console.log("SEED_OK");
        console.log(`WARDEN_EMAIL=${warden.email}`);
        console.log(`PASSWORD=${PASSWORD}`);
        students.forEach((student) => console.log(`STUDENT_EMAIL=${student.email}`));
        console.log(`ROOM1=${room1.room_number} OCCUPIED=${room1.occupants.length}/${room1.capacity}`);
        console.log(`ROOM2=${room2.room_number} OCCUPIED=${room2.occupants.length}/${room2.capacity}`);
        console.log(`ATTENDANCE_MARKED=${students.length}`);
        console.log(`COMPLAINTS_CREATED=${complaintsCount}`);
    } catch (error) {
        console.error("SEED_FAILED", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

run();
