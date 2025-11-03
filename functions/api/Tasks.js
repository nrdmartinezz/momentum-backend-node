const firestore = require("../data/firestore");
const express = require("express");

const authenticateToken = require("../middleware/authentication");
require("dotenv").config();

const router = express.Router();

// CREATE Task
router.post("/", authenticateToken, async (req, res) => {
  console.log("Received task creation request:", req.body);
  const user_id = req.user?.userId; // Get user ID from JWT token
  const { title, description, status, due_date } = req.body;
  if (!user_id || !title) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const result = await firestore.collection("tasks").add({
    user_id,
    title,
    description,
    status: status || "",
    due_date,
  });
  
  if (result.id) {
    res.status(201).json({ message: "Task created", taskId: result.id });
  } else {
    res.status(500).json({ error: "Task creation failed" });
  }
});

// READ All Tasks for a User
router.get("/", authenticateToken, async (req, res) => {
  console.log("Received request to fetch tasks for user");
  const user_id = req.user?.userId;
  if (!user_id) return res.status(400).json({ error: "User ID required" });

  const tasks = await firestore
    .collection("tasks")
    .where("user_id", "==", user_id)
    .get();

  if (tasks.empty) {
    return res.status(404).json({ error: "No tasks found" });
  }

  const taskList = tasks.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.json(taskList);
});



// READ Single Task by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user?.userId;

  try {
    const task = await firestore.collection("tasks").doc(id).get();
    if (!task.exists) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Verify the task belongs to the authenticated user
    const taskData = task.data();
    if (taskData.user_id !== user_id) {
      return res.status(403).json({ error: "Unauthorized access to task" });
    }
    
    res.json({ id: task.id, ...taskData });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// UPDATE Task (protected)
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  const { title, description, status, due_date } = req.body;

  try {
    // Verify the task belongs to the authenticated user
    const task = await firestore.collection("tasks").doc(id).get();
    if (!task.exists) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    if (task.data().user_id !== user_id) {
      return res.status(403).json({ error: "Unauthorized access to task" });
    }
    
    await firestore.collection("tasks").doc(id).update({
      title,
      description,
      status,
      due_date,
    });
    res.json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE Task (protected)
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user?.userId;

  try {
    // Verify the task belongs to the authenticated user
    const task = await firestore.collection("tasks").doc(id).get();
    if (!task.exists) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    if (task.data().user_id !== user_id) {
      return res.status(403).json({ error: "Unauthorized access to task" });
    }
    
    await firestore.collection("tasks").doc(id).delete();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;
