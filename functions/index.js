const functions = require("firebase-functions");
const express = require("express");
const usersRoutes = require("./api/Users");

const app = express();
app.use(express.json());

// Register user routes
app.use("/users", usersRoutes);

// Define your API routes
app.get("/", (req, res) => {
  res.send("Hello from Express on Firebase Functions!");
});

// Expose the Express app as a Cloud Function
exports.api = functions.https.onRequest(app);