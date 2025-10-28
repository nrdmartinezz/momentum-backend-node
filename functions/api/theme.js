const express = require("express");
const firestore = require("../data/firestore");
const authenticateToken = require("../middleware/authentication");

const router = express.Router();

// 🔹 Get User Theme (protected)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const docRef = firestore.collection("user_themes").doc(userId);
    const themeSnapshot = await docRef.get();

    if (!themeSnapshot.exists) {
      // Return default theme if none exists
      const defaultTheme = {
        accent_color: "#7E52B3",
        primary_color: "#1a1a1a",
        sound: "default",
        background_image: "https://res.cloudinary.com/ddsekdku7/image/upload/v1742144459/default-theme-login.jpg",
        created_at: new Date(),
        updated_at: new Date(),
      };
      await docRef.set(defaultTheme, { merge: true });
      return res.json(defaultTheme);
    }

    res.json(themeSnapshot.data());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user theme" });
  }
});

// 🔹 Create User Theme (protected)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { accent_color, primary_color, sound, background_image } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) return res.status(400).json({ error: "User ID required" });

    // Check if theme already exists
    const docRef = firestore.collection("user_themes").doc(userId);
    const existingTheme = await docRef.get();
    
    if (existingTheme.exists) {
      return res.status(400).json({ error: "Theme already exists. Use PUT to update." });
    }

    const themeData = {
      accent_color: accent_color || "#7E52B3",
      primary_color: primary_color || "#1a1a1a",
      sound: sound || "default",
      background_image: background_image || "https://res.cloudinary.com/ddsekdku7/image/upload/v1742144459/default-theme-login.jpg",
      created_at: new Date(),
      updated_at: new Date(),
    };

    await docRef.set(themeData);

    res.status(201).json({ 
      message: "Theme created successfully", 
      userId,
      theme: themeData 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create theme" });
  }
});

// 🔹 Update User Theme (protected)
router.post("/update", authenticateToken, async (req, res) => {
  try {
    const { 
      userId: bodyUserId, 
      accent_color, 
      primary_color, 
      sound, 
      background_image 
    } = req.body;
    const userId = bodyUserId || req.user?.userId;

    if (!userId) return res.status(400).json({ error: "User ID required" });

    const updateData = {
      updated_at: new Date(),
    };

    // Only update fields that are provided
    if (accent_color !== undefined) updateData.accent_color = accent_color;
    if (primary_color !== undefined) updateData.primary_color = primary_color;
    if (sound !== undefined) updateData.sound = sound;
    if (background_image !== undefined) updateData.background_image = background_image;

    await firestore.collection("user_themes").doc(userId).set(
      updateData,
      { merge: true }
    );

    res.json({ message: "Theme updated successfully", userId, theme: updateData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update theme" });
  }
});

// 🔹 Delete User Theme (protected)
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.body.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const docRef = firestore.collection("user_themes").doc(userId);
    const themeSnapshot = await docRef.get();

    if (!themeSnapshot.exists) {
      return res.status(404).json({ error: "Theme not found" });
    }

    await docRef.delete();
    res.json({ message: "Theme deleted successfully", userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete theme" });
  }
});

module.exports = router;
