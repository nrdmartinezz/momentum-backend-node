const functions = require("firebase-functions");
const express = require("express");
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK once per instance
if (!admin.apps.length) {
  admin.initializeApp();
}


const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// Register user routes
const usersRoutes = require("./api/Users");
app.use("/users", usersRoutes);

// Register chore routes
// const choresRoutes = require("./api/Chores");
// app.use("/chores", choresRoutes);

// Register task routes
// const tasksRoutes = require("./api/Tasks");
// app.use("/tasks", tasksRoutes);

// Define your API routes
app.get("/", (req, res) => {
  res.send("Hello from Express on Firebase Functions!");
});

// Expose the Express app as a Cloud Function
exports.api = functions.https.onRequest(app);