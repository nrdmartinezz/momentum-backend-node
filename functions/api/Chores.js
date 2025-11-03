
const express = require("express");
const firestore = require("../data/firestore");
const authenticateToken = require("../middleware/authentication");
require("dotenv").config();

const router = express.Router();

// CREATE Chore
router.post("/", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user?.userId;
    const { name, description, status, due_date } = req.body;
    
    if (!user_id || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const result = await firestore.collection("chores").add({
      user_id,
      name,
      description,
      status: status || "pending",
      due_date,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    if (result.id) {
      res.status(201).json({ message: "Chore created", choreId: result.id });
    } else {
      res.status(500).json({ error: "Chore creation failed" });
    }
  } catch (error) {
    console.error("Error creating chore:", error);
    res.status(500).json({ error: "Failed to create chore" });
  }
});

// READ All Chores for a User
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) return res.status(400).json({ error: "User ID required" });

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
router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  
  try {
    const doc = await firestore.collection("chores").doc(id).get(); 
    if (!doc.exists) {
      return res.status(404).json({ error: "Chore not found" });
    }
    
    // Verify the chore belongs to the authenticated user
    const choreData = doc.data();
    if (choreData.user_id !== user_id) {
      return res.status(403).json({ error: "Unauthorized access to chore" });
    }
    
    res.json({ id: doc.id, ...choreData });
  } catch (error) {
    console.error("Error fetching chore:", error);
    res.status(500).json({ error: "Failed to fetch chore" });
  }
});

// UPDATE Chore (protected)
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  const { name, description, status, due_date } = req.body;

  try {
    const doc = await firestore.collection("chores").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Chore not found" });
    }
    
    // Verify the chore belongs to the authenticated user
    if (doc.data().user_id !== user_id) {
      return res.status(403).json({ error: "Unauthorized access to chore" });
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
  const user_id = req.user?.userId;

  try {
    const doc = await firestore.collection("chores").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Chore not found" });
    }
    
    // Verify the chore belongs to the authenticated user
    if (doc.data().user_id !== user_id) {
      return res.status(403).json({ error: "Unauthorized access to chore" });
    }

    await firestore.collection("chores").doc(id).delete();
    res.json({ message: "Chore deleted successfully" });
  } catch (error) {
    console.error("Error deleting chore:", error);
    res.status(500).json({ error: "Failed to delete chore" });
  }
});

module.exports = router;
