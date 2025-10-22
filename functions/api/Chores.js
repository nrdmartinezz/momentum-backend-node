
const express = require("express");
const firestore = require("../data/firestore");
const authenticateToken = require("../middleware/authentication");
require("dotenv").config();

const router = express.Router();

// CREATE Chore
router.post("/", (req, res) => {
  const { user_id, name, description, status, due_date } = req.body;
  if (!user_id || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const query = `INSERT INTO chores (id, user_id, name, description, status, due_date, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, NOW(), NOW())`;
  db.query(query, [user_id, name, description || "", status || "pending", due_date || null], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to create chore" });
    }
    res.status(201).json({ message: "Chore created", choreId: result.insertId });
  });
});

// READ All Chores for a User
router.get("/", (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "User ID required" });
  db.query("SELECT * FROM chores WHERE user_id = ?", [user_id], (err, chores) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch chores" });
    }
    res.json(chores);
  });
});

// READ Single Chore by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM chores WHERE id = ?", [id], (err, chores) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch chore" });
    }
    if (!chores || chores.length === 0) return res.status(404).json({ error: "Chore not found" });
    res.json(chores[0]);
  });
});

// UPDATE Chore (protected)
router.put("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, description, status, due_date } = req.body;
  const query = `UPDATE chores SET name = ?, description = ?, status = ?, due_date = ?, updated_at = NOW() WHERE id = ?`;
  db.query(query, [name, description, status, due_date, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to update chore" });
    }
    res.json({ message: "Chore updated" });
  });
});

// DELETE Chore (protected)
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM chores WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete chore" });
    }
    res.json({ message: "Chore deleted" });
  });
});

module.exports = router;
