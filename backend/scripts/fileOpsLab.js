const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "lab_notes.txt");
const renamedFilePath = path.join(__dirname, "lab_notes_renamed.txt");

fs.writeFileSync(filePath, "Hostel Lab File Operations\n", "utf8");
fs.appendFileSync(filePath, "1. Read Write Append Delete demo\n", "utf8");

const content = fs.readFileSync(filePath, "utf8");
console.log("FILE_CONTENT_START");
console.log(content.trim());
console.log("FILE_CONTENT_END");

fs.renameSync(filePath, renamedFilePath);
console.log("RENAMED_OK");

fs.unlinkSync(renamedFilePath);
console.log("DELETE_OK");
