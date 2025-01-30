const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
require("dotenv").config();

const router = express.Router();

// 🔹 User Signup
router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Missing fields" });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into DB
        const [result] = await db.query(
            "INSERT INTO users (id, email, password_hash) VALUES (UUID(), ?, ?)",
            [email, hashedPassword]
        );

        res.status(201).json({ message: "User created", userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Signup failed" });
    }
});

// 🔹 User Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Missing fields" });

        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.status(401).json({ error: "Invalid email or password" });

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

        // Generate JWT
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        res.json({ message: "Login successful", token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Login failed" });
    }
});

// 🔹 Delete User
router.delete("/delete_user", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID required" });

        await db.query("DELETE FROM users WHERE id = ?", [userId]);
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// 🔹 Get User Settings
router.get("/get_user_settings", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID required" });

        const [settings] = await db.query("SELECT * FROM user_settings WHERE user_id = ?", [userId]);
        if (settings.length === 0) return res.status(404).json({ error: "Settings not found" });

        res.json(settings[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch user settings" });
    }
});

// 🔹 Update User Settings
router.put("/update_user_settings", async (req, res) => {
    try {
        const { userId, theme_id, pomodoro_duration, short_break_duration, long_break_duration } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID required" });

        await db.query(
            `UPDATE user_settings 
             SET theme_id = ?, pomodoro_duration = ?, short_break_duration = ?, long_break_duration = ?, updated_at = NOW() 
             WHERE user_id = ?`,
            [theme_id, pomodoro_duration, short_break_duration, long_break_duration, userId]
        );

        res.json({ message: "Settings updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update user settings" });
    }
});

module.exports = router;
