# Cycle 2 - File 1
## React Forms, CSS, Events, and HTTP (Programs 8 to 11)

Cycle 2 allows webpage/UI results.  
Use this file for React + Express integration experiments.

## Converted Program List (Project-Aligned)
8. Develop React forms using CSS and event handling in Hostel Management UI.
9. Develop Student Registration form with validation.
10. Access JSON data from backend API using HTTP service (`fetch` wrapper).
11. Manage student information using Express backend + React frontend.

## Common setup for all programs
1. From root folder:
```bash
npm install
npm run install:all
npm run dev
```
2. Open:
   Frontend: `http://localhost:5173`  
   Backend API: `http://localhost:5000`

---

## Program 8: React Form with CSS and Events
### Aim
To create React forms with CSS styling and event handling for login and register interactions.

### Description
This program builds React forms for hostel user interactions.
It applies CSS classes for clean and consistent UI styling.
It handles button clicks and form submit events.
It confirms interactive behavior on login and register screens.

### Project code used
File: `frontend/src/App.jsx`
```jsx
<form className="stack-form" onSubmit={login}>
  <input name="email" type="email" placeholder="Email" required />
  <input name="password" type="password" placeholder="Password" required />
  <button className="btn btn-primary" type="submit">Login</button>
</form>
```

File: `frontend/src/styles.css`
```css
.stack-form { display: grid; gap: 10px; margin-top: 12px; }
.btn-primary { background: linear-gradient(140deg, #22c55e, #14b8a6); }
```

### Steps
1. Start both frontend and backend from project root using `npm run dev`.
2. Open `http://localhost:5173` in browser.
3. Open authentication page and switch `Login` and `Register` tabs.
4. Enter sample values and submit forms.
5. Observe button click behavior, input validation, and toast messages.

### What to capture in output
1. Screenshot of Login form with applied CSS.
2. Screenshot of Register form with applied CSS.
3. Screenshot showing success or error toast after submit.

---

## Program 9: Student Registration Form + Validation
### Aim
To implement a student registration form and validate data on both frontend and backend.

### Description
This program implements secure student registration flow.
It validates required inputs on the frontend form.
It enforces backend checks like minimum password length.
It confirms successful account creation with correct role mapping.

### Project code used
File: `frontend/src/App.jsx`
```jsx
<input name="email" type="email" required />
<input name="password" type="password" required />
<select name="role" required>
  <option value="Student">Student</option>
  <option value="Warden">Warden</option>
</select>
```

File: `backend/src/routes/userRoutes.js`
```js
const missingFields = requireFields(req.body, ["name", "email", "password", "role"]);
if (`${req.body.password}`.length < 8) {
    throw new AppError("Password must be at least 8 characters long.", 400);
}
```

### Steps
1. Open Register tab in the frontend.
2. Submit with missing values to trigger required-field validation.
3. Submit invalid email and short password to trigger validation errors.
4. Submit valid student details with password length >= 8.
5. Confirm successful registration and login/session creation.

### What to capture in output
1. Validation error screenshot for invalid form submission.
2. Successful registration response or UI success toast screenshot.
3. Proof in response/profile that user role is `Student`.

---

## Program 10: Access JSON from Server via HTTP Service
### Aim
To fetch and display backend JSON data in React using a reusable HTTP utility.

### Description
This program demonstrates client-server data exchange in JSON format.
It uses a reusable API helper for HTTP requests.
It fetches hostel module data from backend endpoints.
It renders fetched records in React tables and cards.

### Project code used
File: `frontend/src/apiClient.js`
```js
export const apiRequest = async (path, { method = "GET", token, body, query } = {}) => {
    const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const payload = await parseResponse(response);
    if (!response.ok) throw error;
    return payload;
};
```

File: `frontend/src/App.jsx`
```js
const loadAttendance = async (query = attendanceFilter) => {
  const payload = await apiRequest("/api/attendance", { token, query });
  setAttendance(payload.data || []);
};
```

### Steps
1. Login to the frontend application.
2. Open any data module such as Attendance, Complaints, or Leaves.
3. Click filter or refresh to trigger API requests.
4. Open browser Developer Tools and go to Network tab.
5. Select an `/api/*` request and inspect response JSON.

### What to capture in output
1. Network tab screenshot showing endpoint, status code, and JSON response.
2. UI screenshot where the same fetched records are rendered.

---

## Program 11: Student Information Management (Express + React)
### Aim
To manage student records through integrated React frontend and Express backend APIs.

### Description
This program demonstrates full-stack student data management.
It connects React screens with Express REST APIs.
It performs create, read, update, and delete style actions.
It verifies data changes through UI and backend responses.

### Project code used
File: `backend/src/routes/userRoutes.js`
```js
router.get("/", protect, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => { ... }));
router.put("/:id", protect, asyncHandler(async (req, res) => { ... }));
router.delete("/:id", protect, authorize("Warden"), asyncHandler(async (req, res) => { ... }));
```

File: `frontend/src/App.jsx`
```jsx
{view === "users" && isAdmin && (
  <section className="view-grid"> ... user list, create user, role update, delete ... </section>
)}
```

### Steps
1. Login as Warden in the frontend.
2. Open `Users` module from sidebar.
3. Create a new Student account.
4. Perform search/filter on user list.
5. Update one user field or role.
6. Delete one non-warden user record.
7. Verify final data in UI and optionally using `GET /api/users`.

### What to capture in output
1. Users page screenshot showing list and newly created record.
2. One API response screenshot for create/update/delete action.
3. Final screenshot proving user list changed after operation.

---

## End-of-File Submission Checklist
1. UI screenshots are included (allowed in Cycle 2).
2. HTTP request/response evidence is included.
3. Form validation evidence is included.
