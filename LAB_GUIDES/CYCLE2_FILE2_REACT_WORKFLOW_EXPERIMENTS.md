# Cycle 2 - File 2
## React Workflow Experiments (Programs 12 to 14)

This file maps Programs 12 to 14 to your Hostel Management project modules.

## Converted Program List (Project-Aligned)
12. Create a React decision workflow (voting-like approve/reject flow) for hostel requests.
13. Develop leave management where students apply leave and warden reviews status.
14. Build a React component-based multi-page-like application with navigation/routing behavior for hostel modules.

## Common setup
1. Start both services from root:
```bash
npm run dev
```
2. Open app at `http://localhost:5173`.

---

## Program 12: Voting-Like Decision Application
Project replacement for voting app: `Approve/Reject` decision on leave requests.
### Aim
To implement a voting-like decision flow by approving or rejecting leave requests.

### Description
This program models a voting-like decision workflow.
It allows warden to review pending student leave requests.
It records final decision as Approved or Rejected status.
It validates status changes through role-based API logic.

### Project code used
File: `frontend/src/App.jsx`
```js
const reviewLeave = async (event, id) => {
  await apiRequest(`/api/leaves/${id}`, {
    method: "PUT",
    token,
    body: {
      status: formData.get("status"),
      review_note: formData.get("review_note")
    }
  });
};
```

File: `backend/src/routes/leaveRoutes.js`
```js
if (!LEAVE_STATUSES.includes(req.body.status)) {
    throw new AppError(`Invalid status. Allowed values: ${LEAVE_STATUSES.join(", ")}`, 400);
}
leave.status = req.body.status;
```

### Steps
1. Login as Student and create a leave request.
2. Logout and login as Warden.
3. Open `Leaves` module and select pending request.
4. Choose `Approved` or `Rejected`, add review note, and submit.
5. Login again as Student and verify final status update.

### What to capture in output
1. Screenshot of leave request in `Pending` status.
2. Screenshot of warden review action with selected decision.
3. Screenshot of final updated status visible to student.

---

## Program 13: Leave Management System
This matches your project directly.
### Aim
To build and verify full leave management lifecycle for student and warden roles.

### Description
This program implements end-to-end leave management operations.
Students can submit leave requests with date range and reason.
Warden can review, update status, and add review notes.
Both roles can track final leave status in the module.

### Project code used
File: `backend/src/routes/leaveRoutes.js`
```js
router.post("/", protect, asyncHandler(async (req, res) => { ... }));   // student create
router.get("/", protect, asyncHandler(async (req, res) => { ... }));    // student/warden list
router.put("/:id", protect, asyncHandler(async (req, res) => { ... })); // student edit or warden review
router.delete("/:id", protect, asyncHandler(async (req, res) => { ... }));
```

File: `frontend/src/App.jsx`
```jsx
{view === "leaves" && (
  <section className="view-grid">
    {/* student request form + leave board + warden review form */}
  </section>
)}
```

### Steps
1. Login as Student and submit leave with `from_date`, `to_date`, and `reason`.
2. Verify request appears in leave board with `Pending` status.
3. Login as Warden and filter leave records.
4. Update leave status and review note.
5. Login as Student and verify updated status and note.
6. Optionally test student edit/delete only while status is `Pending`.

### What to capture in output
1. Screenshot of student leave form submission result.
2. Screenshot of leave board status badges.
3. One API response screenshot for create and one for review update.

---

## Program 14: Component-Based App with Routing/Navigation
Project replacement for music-store routing: hostel modules with sidebar navigation.
### Aim
To implement role-based module navigation in a React single-page application.

### Description
This program demonstrates component-based navigation in React.
It switches modules using sidebar menu and view state.
It applies role-based visibility for Student and Warden.
It mimics routing behavior within a single-page workflow.

### Project code used
File: `frontend/src/App.jsx`
```js
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", roles: ["Student", "Warden"] },
  { id: "users", label: "Users", roles: ["Warden"] },
  { id: "rooms", label: "Rooms", roles: ["Warden"] },
  { id: "attendance", label: "Attendance", roles: ["Student", "Warden"] },
  { id: "complaints", label: "Complaints", roles: ["Student", "Warden"] },
  { id: "leaves", label: "Leaves", roles: ["Student", "Warden"] },
  { id: "notices", label: "Notices", roles: ["Student", "Warden"] }
];
```

### Steps
1. Login as Warden and observe sidebar modules.
2. Navigate across Dashboard, Users, Rooms, Attendance, Complaints, Leaves, and Notices.
3. Logout and login as Student.
4. Verify Student role can access only allowed modules.
5. Confirm `Users` and `Rooms` are hidden for Student.

### What to capture in output
1. Sidebar screenshot as Warden showing all admin modules.
2. Sidebar screenshot as Student showing restricted modules.
3. One screenshot each of Complaints, Leaves, and Notices views.

---

## Viva/Record Notes You Can Add
1. Program 12 is mapped to leave decision workflow (`Approve/Reject`) as a voting-equivalent logic.
2. Program 14 uses state-based module navigation in existing project (`view` + `NAV_ITEMS`); this is acceptable as page routing behavior in SPA.
3. If strict URL routing is requested later, this project can be extended with `react-router-dom`.

---

## End-of-File Submission Checklist
1. Include UI screenshots for each program in this file.
2. Include at least one API response screenshot for leave operations.
3. Include role-based navigation evidence (Student vs Warden).
