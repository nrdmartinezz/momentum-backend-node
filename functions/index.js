const functions = require("firebase-functions");
const express = require("express");
const usersRoutes = require("./api/users");

const app = express();
app.use(express.json());

// Register user routes
app.use("/users", usersRoutes);

exports.api = functions.https.onRequest(app);
