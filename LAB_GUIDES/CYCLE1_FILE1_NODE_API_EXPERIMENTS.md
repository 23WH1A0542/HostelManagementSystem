# Cycle 1 - File 1
## Node.js + Express API Experiments (Programs 1 to 4)

Use this file for **Cycle 1 record**.  
As instructed by your sir: for Cycle 1 results, use only `console + Postman/Thunder Client + Mongo tools` (no webpage/UI screenshots).

## Converted Program List (Project-Aligned)
1. Set up Node.js backend environment and display API health message for Hostel Management.
2. Build user login system (register, login, token auth) for Student/Warden.
3. Perform file read/write/append/delete operations using Node.js console script.
4. Build HTTP request-response flow for hostel service operations (complaints/leaves) using Node.js + Express.

## Program 1: Node Environment + "Hello World" Equivalent
### Description
This program verifies the backend Node.js environment for the project.
It confirms that dependencies and configuration are working correctly.
It starts the Express server and checks API availability.
It validates the health endpoint JSON response.

### Project code used
File: `backend/src/app.js`
```js
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Hostel Management API is running."
    });
});
```

### Execution steps
1. Open terminal in project root: `c:\Users\reanu\HOSTEL_MANAGEMENT`.
2. Install dependencies:
```bash
npm install
npm run install:all
```
3. Create backend env file:
```bash
cd backend
copy .env.example .env
```
4. Update `.env` with valid values for `MONGO_URI` and `JWT_SECRET`.
5. Start backend:
```bash
npm run dev
```
6. In Postman/Thunder Client, call:
```http
GET http://localhost:5000/
```

### What to capture in output
1. Terminal output line: `Server running on port 5000`.
2. Postman response JSON showing:
```json
{ "success": true, "message": "Hostel Management API is running." }
```

---

## Program 2: User Login System
### Description
This program implements user authentication for Student and Warden roles.
It covers registration, login, and secure token generation.
It uses bearer-token based protection for private endpoints.
It verifies profile access only for authenticated users.

### Project code used
File: `backend/src/routes/userRoutes.js`
```js
router.post("/register", asyncHandler(async (req, res) => { ... }));
router.post("/login", asyncHandler(async (req, res) => { ... }));
router.get("/profile", protect, asyncHandler(async (req, res) => { ... }));
```

File: `backend/src/middlewares/auth.js`
```js
const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
const decoded = verifyToken(token, process.env.JWT_SECRET);
```

### Postman steps
1. Register Student:
```http
POST http://localhost:5000/api/users/register
Content-Type: application/json
```
```json
{
  "name": "Lab Student",
  "email": "lab_student_1@demo.com",
  "password": "Password123!",
  "role": "Student"
}
```
2. Login with same credentials:
```http
POST http://localhost:5000/api/users/login
```
```json
{
  "email": "lab_student_1@demo.com",
  "password": "Password123!"
}
```
3. Copy returned token.
4. Access profile:
```http
GET http://localhost:5000/api/users/profile
Authorization: Bearer <token>
```

### What to capture in output
1. Register success response with `token` and user `role`.
2. Login success response with `message: "Login successful."`.
3. Profile response using bearer token.
4. One negative case:
   Invalid password gives `401 Invalid email or password.`

---

## Program 3: Node.js File Operations (Console-Based)
### Description
This program demonstrates core file handling using Node.js.
It performs create, write, append, and read operations.
It also renames and deletes files through script execution.
It validates results using terminal console output.

### Lab script (create for experiment)
Create file `backend/scripts/fileOpsLab.js`:
```js
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "lab_notes.txt");

fs.writeFileSync(filePath, "Hostel Lab File Operations\n", "utf8");
fs.appendFileSync(filePath, "1. Read Write Append Delete demo\n", "utf8");

const content = fs.readFileSync(filePath, "utf8");
console.log("FILE_CONTENT_START");
console.log(content.trim());
console.log("FILE_CONTENT_END");

fs.renameSync(filePath, path.join(__dirname, "lab_notes_renamed.txt"));
console.log("RENAMED_OK");

fs.unlinkSync(path.join(__dirname, "lab_notes_renamed.txt"));
console.log("DELETE_OK");
```

### Execution steps
1. Go to backend folder:
```bash
cd backend
```
2. Run:
```bash
node scripts/fileOpsLab.js
```

### What to capture in output
1. Console logs: `FILE_CONTENT_START ... FILE_CONTENT_END`.
2. Console log: `RENAMED_OK`.
3. Console log: `DELETE_OK`.

---

## Program 4: HTTP Requests/Responses in Hostel Workflow
This is the project-aligned replacement for food ordering flow.
### Description
This program demonstrates HTTP request and response flow in the project.
It uses complaint APIs to simulate a real hostel service case.
It shows role-based interaction between Student and Warden.
It validates create, fetch, and update operations through API calls.

### Project code used
File: `backend/src/routes/complaintRoutes.js`
```js
router.post("/", protect, asyncHandler(async (req, res) => { ... }));
router.get("/", protect, asyncHandler(async (req, res) => { ... }));
router.put("/:id", protect, asyncHandler(async (req, res) => { ... }));
```

### Postman steps
1. Login as Student and copy token.
2. Create complaint:
```http
POST http://localhost:5000/api/complaints
Authorization: Bearer <student_token>
```
```json
{
  "complaint_type": "Water",
  "description": "No water on 2nd floor since morning."
}
```
3. Login as Warden and copy token.
4. List complaints:
```http
GET http://localhost:5000/api/complaints
Authorization: Bearer <warden_token>
```
5. Update complaint status:
```http
PUT http://localhost:5000/api/complaints/<complaint_id>
Authorization: Bearer <warden_token>
```
```json
{
  "status": "In Progress",
  "resolution_note": "Plumber assigned."
}
```

### What to capture in output
1. Complaint creation response (`201`).
2. Complaint fetch response (`count` and complaint data).
3. Complaint status update response (`message: "Complaint updated successfully."`).

---

## End-of-File Submission Checklist
1. All requests tested from Postman/Thunder Client.
2. Console outputs captured for Program 1 and Program 3.
3. No UI screenshots included for this file (Cycle 1 rule).
