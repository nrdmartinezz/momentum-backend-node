
const express = require("express");

const authenticateToken = require("../middleware/authentication");
require("dotenv").config();

const router = express.Router();

// CREATE Task
router.post("/", (req, res) => {
  const { user_id, title, description, status, due_date } = req.body;
  if (!user_id || !title) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
});

// READ All Tasks for a User
router.get("/", (req, res) => {
 
  if (!user_id) return res.status(400).json({ error: "User ID required" });
  
});

// READ Single Task by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  
});

// UPDATE Task (protected)
router.put("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, description, status, due_date } = req.body;
  
});

// DELETE Task (protected)
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  
});

module.exports = router;
