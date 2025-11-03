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
    await firestore.collection("user_settings").doc(result.id).set(
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
      {
        userId: result.id,
        email,
        name: null,
        profilePicture: null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res
      .status(201)
      .json({ message: "User created", token });
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
      {
        userId: userDoc.id,
        name: user.name || null,
        email: user.email,
        profilePicture: user.profilePicture || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

// 🔹 Delete User (protected)
router.delete("/delete_user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    // Delete user document
    await firestore.collection("users").doc(userId).delete();
    
    // Also delete user settings
    await firestore.collection("user_settings").doc(userId).delete();
    
    // Delete all user's tasks
    const tasksSnapshot = await firestore
      .collection("tasks")
      .where("user_id", "==", userId)
      .get();
    
    const taskDeletePromises = tasksSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(taskDeletePromises);
    
    // Delete all user's chores
    const choresSnapshot = await firestore
      .collection("chores")
      .where("user_id", "==", userId)
      .get();
    
    const choreDeletePromises = choresSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(choreDeletePromises);

    res.json({ message: "User and all associated data deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// 🔹 Update User Profile (protected)
router.put("/update_profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const { name, profilePicture } = req.body;

    // Build update object with only provided fields
    const updateData = {
      updated_at: new Date(),
    };

    if (name !== undefined) updateData.name = name;

    // Handle profile picture upload to Cloudinary
    if (profilePicture !== undefined) {
      try {
        const cloudName = process.env.CLOUNDINARY_CLOUD_NAME;
        if (!cloudName) {
          return res
            .status(500)
            .json({ error: "Cloudinary configuration missing" });
        }

        // Upload to Cloudinary
        const formData = new URLSearchParams();
        formData.append("file", profilePicture);
        formData.append("upload_preset", "ml_default"); // You may need to configure this in Cloudinary
        console.log(cloudName);
        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("Cloudinary upload failed");
        }

        const uploadData = await uploadResponse.json();
        updateData.profilePicture = uploadData.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res
          .status(500)
          .json({ error: "Failed to upload profile picture" });
      }
    }

    await firestore.collection("users").doc(userId).update(updateData);

    // Get updated user data
    const updatedUserDoc = await firestore.collection("users").doc(userId).get();
    const updatedUser = updatedUserDoc.data();

    // Generate new JWT with updated user data
    const newToken = await signAsync(
      {
        userId: userId,
        name: updatedUser.name || null,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Profile updated successfully",
      token: newToken,
      profilePicture: updateData.profilePicture,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// 🔹 Get User Settings (protected)
router.get("/get_user_settings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const docRef = firestore.collection("user_settings").doc(userId);
    let settingsSnapshot = await docRef.get();
    if (!settingsSnapshot.exists) {
      const defaults = {
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
router.post("/update_user_settings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const {
      pomodoro_duration,
      short_break_duration,
      long_break_duration,
    } = req.body;

    await firestore.collection("user_settings").doc(userId).set(
      {
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
