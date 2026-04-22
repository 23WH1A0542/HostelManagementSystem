const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");
const { errorHandler, notFound } = require("./middlewares/errorHandler");

dotenv.config();

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

const userRoutes = require("./routes/userRoutes");
const roomRoutes = require("./routes/roomRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const noticeRoutes = require("./routes/noticeRoutes");

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Hostel Management API is running."
    });
});

app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/notices", noticeRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing in environment variables.");
        }

        await connectDB();
        const port = process.env.PORT || 5000;

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error("Server failed to start.", error.message);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;
