# Cycle 1 - File 2
## MongoDB Experiments (Programs 5 to 7)

This file covers MongoDB-oriented labs for your Hostel Management project.

## Converted Program List (Project-Aligned)
5. Perform basic database and collection commands on `hostel_management`.
6. Perform CRUD operations on hostel datasets (`users`, `rooms`, `complaints`, `leaverequests`, `notices`, `attendances`).
7. Perform count, limit, sort, and skip operations on hostel collections.

## Setup for all MongoDB experiments
1. Ensure backend `.env` has a working `MONGO_URI`.
2. Start backend:
```bash
cd backend
npm run dev
```
3. Optional demo data:
```bash
npm run seed:demo
```
4. Open Mongo shell:
```bash
mongosh "mongodb://127.0.0.1:27017/hostel_management"
```

You may use `mongosh` OR Compass/Atlas for execution.  
For result submission, capture query and output from whichever tool you use.

---

## Program 5: Basic DB and Collection Commands
### Description
This program introduces basic MongoDB operations for the hostel database.
It connects to the target database from mongosh or Compass.
It lists available collections and inspects stored records.
It confirms database structure used by the application.

### Project code used
File: `backend/src/models/User.js`
```js
module.exports = mongoose.model("User", userSchema);
```

File: `backend/src/models/Room.js`
```js
module.exports = mongoose.model("Room", roomSchema);
```

### mongosh commands
```javascript
show dbs
use hostel_management
show collections
db.users.findOne()
db.rooms.findOne()
db.complaints.findOne()
```

### What to capture in output
1. `use hostel_management` confirmation.
2. `show collections` output with hostel collections.
3. One sample document from `users` and `rooms`.

---

## Program 6: CRUD Operations on Dataset
Use `complaints` collection for clear demonstration.
### Description
This program demonstrates full CRUD on hostel data collections.
It inserts new records and reads them with filters.
It updates selected fields and verifies modified output.
It removes records to complete the CRUD lifecycle.

### Create
```javascript
db.complaints.insertOne({
  student_id: ObjectId("PUT_VALID_STUDENT_ID"),
  complaint_type: "Room",
  description: "Fan is not working in room.",
  status: "Pending",
  assigned_to: null,
  resolution_note: "",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Read
```javascript
db.complaints.find({ complaint_type: "Room" }).pretty()
```

### Update
```javascript
db.complaints.updateOne(
  { complaint_type: "Room", status: "Pending" },
  { $set: { status: "In Progress", resolution_note: "Technician assigned", updatedAt: new Date() } }
)
```

### Delete
```javascript
db.complaints.deleteOne({ complaint_type: "Room", status: "In Progress" })
```

### API alternative (Postman)
You can also perform CRUD through:
1. `POST /api/complaints`
2. `GET /api/complaints`
3. `PUT /api/complaints/:id`
4. `DELETE /api/complaints/:id`

### What to capture in output
1. Insert result with `insertedId`.
2. Find result showing inserted complaint.
3. Update result showing `matchedCount` and `modifiedCount`.
4. Delete result showing `deletedCount`.

---

## Program 7: Count, Limit, Sort, Skip
Use `users`, `complaints`, and `leaverequests`.
### Description
This program demonstrates advanced query helpers in MongoDB.
It uses count to measure records matching conditions.
It applies sort and limit to control result ordering and size.
It uses skip to implement simple pagination behavior.

### Count
```javascript
db.users.countDocuments({ role: "Student" })
db.complaints.countDocuments({ status: "Pending" })
```

### Limit
```javascript
db.users.find().limit(5).pretty()
```

### Sort
```javascript
db.complaints.find().sort({ createdAt: -1 }).limit(5).pretty()
db.leaverequests.find().sort({ from_date: 1 }).pretty()
```

### Skip (pagination demo)
```javascript
db.users.find().sort({ createdAt: -1 }).skip(5).limit(5).pretty()
```

### Related project API sort usage
File: `backend/src/routes/complaintRoutes.js`
```js
const complaints = await Complaint.find(filter)
    .populate("student_id", "name email role")
    .populate("assigned_to", "name email role")
    .sort({ createdAt: -1 });
```

### What to capture in output
1. Count outputs for at least two collections.
2. Limited results (`limit(5)`).
3. Sorted results showing descending `createdAt`.
4. Skip + limit pagination output.

---

## End-of-File Submission Checklist
1. Mongo commands executed in `mongosh` or Compass/Atlas query panel.
2. Query text and result output captured.
3. No webpage/UI result screenshots included for this file (Cycle 1 rule).
