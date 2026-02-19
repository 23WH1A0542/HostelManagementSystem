const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Import Routes
const userRoutes = require("./routes/userRoutes");
const roomRoutes = require("./routes/roomRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const complaintRoutes = require("./routes/complaintRoutes");

// Use Routes
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/complaints", complaintRoutes);

// Test Route
app.get("/", (req, res) => {
    res.send("Hostel Management System Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
