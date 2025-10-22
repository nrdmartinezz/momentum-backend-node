
const express = require("express");
const firestore = require("../data/firestore");
const authenticateToken = require("../middleware/authentication");
require("dotenv").config();

const router = express.Router();

// CREATE Chore
router.post("/", async (req, res) => {
  const { user_id, name, description, status, due_date } = req.body;
  if (!user_id || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const result = await firestore.collection("chores").add({
    user_id,
    name,
    description,
    status,
    due_date,
  });
  if (result.id) {
    res.status(201).json({ message: "Chore created", choreId: result.id });
  } else {
    res.status(500).json({ error: "Chore creation failed" });
  }
});

// READ All Chores for a User
router.get("/", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "User ID required" });

  try {
    const snapshot = await firestore
      .collection("chores")
      .where("user_id", "==", user_id)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "No chores found" });
    }

    const chores = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(chores);
  } catch (error) {
    console.error("Error fetching chores:", error);
    res.status(500).json({ error: "Failed to fetch chores" });
  }
});
    

// READ Single Chore by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await firestore.collection("chores").doc(id).get(); 
    if (!doc.exists) {
      return res.status(404).json({ error: "Chore not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching chore:", error);
    res.status(500).json({ error: "Failed to fetch chore" });
  }
});

// UPDATE Chore (protected)
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, status, due_date } = req.body;

  try {
    const doc = await firestore.collection("chores").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Chore not found" });
    }

    await firestore.collection("chores").doc(id).update({
      name,
      description,
      status,
      due_date,
      updated_at: new Date(),
    });

    res.json({ message: "Chore updated successfully" });
  } catch (error) {
    console.error("Error updating chore:", error);
    res.status(500).json({ error: "Failed to update chore" });
  }
});

// DELETE Chore (protected)
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await firestore.collection("chores").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Chore not found" });
    }

    await firestore.collection("chores").doc(id).delete();
    res.json({ message: "Chore deleted successfully" });
  } catch (error) {
    console.error("Error deleting chore:", error);
    res.status(500).json({ error: "Failed to delete chore" });
  }
});

module.exports = router;
