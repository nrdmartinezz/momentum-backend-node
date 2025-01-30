const functions = require("firebase-functions");
const express = require("express");
const app = express();

// Define your API routes
app.get("/", (req, res) => {
  res.send("Hello from Express on Firebase Functions!");
});

// Expose the Express app as a Cloud Function
exports.api = functions.https.onRequest(app);