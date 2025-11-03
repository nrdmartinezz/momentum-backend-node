const express = require("express");
const firestore = require("../data/firestore");
const authenticateToken = require("../middleware/authentication");
const cloudinary = require("../config/cloudinary");
require("dotenv").config();

const router = express.Router();

// 🔹 Get User Theme (protected)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const docRef = firestore.collection("user_themes").doc(userId);
    const themeSnapshot = await docRef.get();

    if (!themeSnapshot.exists) {
      // Return default theme if none exists
      const defaultTheme = {
        accent_color: "#7E52B3",
        primary_color: "#ffffff",
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
      primary_color: primary_color || "#ffffff",
      sound: sound || "default",
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Handle background image upload to Cloudinary if provided as base64
    if (background_image && background_image.startsWith("data:")) {
      try {
        // Get user data for public_id
        const userDoc = await firestore.collection("users").doc(userId).get();
        const user = userDoc.data();

        const publicId = `${user.name || userId}_background_image`;

        // Upload to Cloudinary using SDK (automatically signs the request)
        const uploadResult = await cloudinary.uploader.upload(background_image, {
          public_id: publicId,
          folder: "momentum/backgrounds",
          overwrite: true,
          resource_type: "auto",
          transformation: [
            { quality: "auto", fetch_format: "auto" }
          ],
        });
        themeData.background_image = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Background upload error:", uploadError);
        // Use default if upload fails
        themeData.background_image = "https://res.cloudinary.com/ddsekdku7/image/upload/v1742144459/default-theme-login.jpg";
      }
    } else {
      // Use provided URL or default
      themeData.background_image = background_image || "https://res.cloudinary.com/ddsekdku7/image/upload/v1742144459/default-theme-login.jpg";
    }

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
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const { 
      accent_color, 
      primary_color, 
      sound, 
      background_image 
    } = req.body;

    const updateData = {
      updated_at: new Date(),
    };

    // Only update fields that are provided
    if (accent_color !== undefined) updateData.accent_color = accent_color;
    if (primary_color !== undefined) updateData.primary_color = primary_color;
    if (sound !== undefined) updateData.sound = sound;
    
    // Handle background image upload to Cloudinary if provided as base64
    if (background_image !== undefined) {
      if (background_image.startsWith("data:")) {
        try {
          // Get user data for public_id
          const userDoc = await firestore.collection("users").doc(userId).get();
          const user = userDoc.data();

          const publicId = `${user.name || userId}_background_image`;

          // Upload to Cloudinary using SDK (automatically signs the request)
          const uploadResult = await cloudinary.uploader.upload(background_image, {
            public_id: publicId,
            folder: "momentum/backgrounds",
            overwrite: true,
            resource_type: "auto",
            transformation: [
              { quality: "auto", fetch_format: "auto" }
            ],
          });
          updateData.background_image = uploadResult.secure_url;
        } catch (uploadError) {
          console.error("Background upload error:", uploadError);
          return res.status(500).json({ error: "Failed to upload background image" });
        }
      } else {
        // Use provided URL directly
        updateData.background_image = background_image;
      }
    }

    await firestore.collection("user_themes").doc(userId).set(
      updateData,
      { merge: true }
    );

    res.json({ message: "Theme updated successfully", theme: updateData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update theme" });
  }
});

// 🔹 Delete User Theme (protected)
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const docRef = firestore.collection("user_themes").doc(userId);
    const themeSnapshot = await docRef.get();

    if (!themeSnapshot.exists) {
      return res.status(404).json({ error: "Theme not found" });
    }

    await docRef.delete();
    res.json({ message: "Theme deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete theme" });
  }
});

module.exports = router;
