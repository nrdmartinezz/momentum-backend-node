const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const firestore = require("../data/firestore");
const { error } = require("firebase-functions/logger");
const authenticateToken = require("../middleware/authentication");
require("dotenv").config();

const router = express.Router();

// Promisified async signer to avoid blocking the event loop
const signAsync = promisify(jwt.sign);

// Define your user routes here
router.get("/", (req, res) => {
  res.send("User route");
});

// User Signup
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const users = await firestore
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!users.empty) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into DB
    const result = await firestore.collection("users").add({
      email,
      password_hash: hashedPassword,
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (!result.id) {
      return res.status(500).json({ error: "Signup failed" });
    }

    // Create default settings document (idempotent)
    await firestore
      .collection("user_settings")
      .doc(result.id)
      .set(
        {
          theme_id: "default",
          pomodoro_duration: 25,
          short_break_duration: 5,
          long_break_duration: 15,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { merge: true }
      );

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ error: "Server misconfiguration: JWT secret missing" });
    }

    const token = await signAsync(
      { userId: result.id, email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.status(201).json({ message: "User created", userId: result.id, email, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Signup failed" });
  }
});

// 🔹 User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const users = await firestore
      .collection("users")
      .where("email", "==", email)
      .get();
    if (users.empty) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const userDoc = users.docs[0];
    const user = userDoc.data();

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    // Generate JWT
    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ error: "Server misconfiguration: JWT secret missing" });
    }

    const token = await signAsync(
      { userId: userDoc.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token, userId: userDoc.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

// 🔹 Delete User (protected)
router.delete("/delete_user", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const result = await firestore.collection("users").doc(userId).delete();

    if (result) {
      res.json({ message: "User deleted successfully" });
    } else {
      res.status(404).json({ error: "User not found" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// 🔹 Get User Settings (protected)
router.get("/get_user_settings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const docRef = firestore.collection("user_settings").doc(userId);
    let settingsSnapshot = await docRef.get();
    if (!settingsSnapshot.exists) {
      const defaults = {
        theme_id: "default",
        pomodoro_duration: 25,
        short_break_duration: 5,
        long_break_duration: 15,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await docRef.set(defaults, { merge: true });
      return res.json(defaults);
    }

    res.json(settingsSnapshot.data());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user settings" });
  }
});

// 🔹 Update User Settings (protected)
router.put("/update_user_settings", authenticateToken, async (req, res) => {
  try {
    const {
      userId: bodyUserId,
      theme_id,
      pomodoro_duration,
      short_break_duration,
      long_break_duration,
    } = req.body;
    const userId = bodyUserId || req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    await firestore.collection("user_settings").doc(userId).set(
      {
        theme_id,
        pomodoro_duration,
        short_break_duration,
        long_break_duration,
        updated_at: new Date(),
      },
      { merge: true }
    );

    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user settings" });
  }
});

module.exports = router;
