import cloudinary from "../utils/cloudinary.config.js";
import pool from "../utils/db.js";

export const uploadFile = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Please log in to upload files." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded!" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw", // For non-image files
          folder: "markdown", // Upload to the "markdown" folder in Cloudinary
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      uploadStream.end(req.file.buffer);
    });

    // Extract file details
    const { originalname: name, size } = req.file;
    const cloudinaryUrl = result.secure_url;

    // Check file type for content storage
    let content = null;
    const ext = name.split(".").pop().toLowerCase();
    const textFileExtensions = ["md", "txt"]; // Text-based file extensions

    if (textFileExtensions.includes(ext)) {
      content = req.file.buffer.toString("utf-8"); // Extract text content only for text files
    }

    // Insert metadata into PostgreSQL
    const query = `
        INSERT INTO uploadfiles (name, cloudinary_url, size, content, upload_time, user_id)
        VALUES ($1, $2, $3, $4, NOW(), $5)
        RETURNING id, name, cloudinary_url, size, upload_time;
      `;
    const values = [name, cloudinaryUrl, size, content, req.user.id];
    const { rows } = await pool.query(query, values);

    // Send success response
    res.status(201).json({
      message: "File uploaded successfully!",
      file: rows[0],
    });
  } catch (error) {
    if (error.code === "22021") {
      return res.status(400).json({
        error: "File contains invalid encoding or cannot be processed as text.",
      });
    }

    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred during the file upload process." });
  }
};
