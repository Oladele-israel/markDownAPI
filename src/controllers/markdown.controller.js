import cloudinary from "../utils/cloudinary.config.js";
import pool from "../utils/db.js";
import axios from "axios";
import MarkdownIt from "markdown-it";

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

    const { originalname: name, size, buffer } = req.file;

    const existingFileQuery = `
      SELECT id FROM uploadfiles WHERE name = $1 AND user_id = $2;
    `;
    const existingFileResult = await pool.query(existingFileQuery, [
      name,
      req.user.id,
    ]);

    if (existingFileResult.rowCount > 0) {
      return res.status(400).json({
        error: `A file with the name "${name}" already exists in the database.`,
      });
    }

    const cloudinarySearch = await cloudinary.search
      .expression(`folder:markdown AND filename:"${name.split(".")[0]}"`)
      .max_results(1)
      .execute();

    if (cloudinarySearch.resources && cloudinarySearch.resources.length > 0) {
      return res.status(400).json({
        error: `A file with the name "${name}" already exists in Cloudinary.`,
      });
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "raw",
            folder: "markdown",
          },
          (error, result) => (error ? reject(error) : resolve(result))
        )
        .end(buffer);
    });

    const cloudinaryUrl = result.secure_url;

    // Extract text content for text files
    const allowedTextExtensions = ["md", "txt"];
    const fileExtension = name.split(".").pop().toLowerCase();
    const content = allowedTextExtensions.includes(fileExtension)
      ? buffer.toString("utf-8")
      : null;

    const query = `
      INSERT INTO uploadfiles (name, cloudinary_url, size, content, upload_time, user_id)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING id, name, cloudinary_url, size, upload_time;
    `;
    const values = [name, cloudinaryUrl, size, content, req.user.id];
    const { rows } = await pool.query(query, values);

    // Respond with success
    res.status(201).json({
      message: "File uploaded successfully!",
      file: rows[0],
    });
  } catch (error) {
    console.error(error);

    if (error.code === "22021") {
      return res.status(400).json({
        error: "File contains invalid encoding or cannot be processed as text.",
      });
    }

    res
      .status(500)
      .json({ error: "An error occurred during the file upload process." });
  }
};

// endpoint that checks the grammar of the note
export const checkGrammar = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "Invalid input: Please provide valid text for grammar checking.",
      });
    }

    // Define the LanguageTool API endpoint and parameters
    const apiUrl = "https://api.languagetool.org/v2/check";

    // Send a request to LanguageTool API
    const response = await axios.post(
      apiUrl,
      new URLSearchParams({
        text, // Text to check
        language: "en-US",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { matches } = response.data;

    // Format the response to include relevant details
    const suggestions = matches.map((match) => ({
      message: match.message,
      offset: match.offset,
      length: match.length,
      replacements: match.replacements.map((replacement) => replacement.value),
      context: {
        text: match.context.text,
        offset: match.context.offset,
        length: match.context.length,
      },
    }));

    // Return grammar suggestions
    return res.status(200).json({
      message: "Grammar suggestions retrieved successfully!",
      suggestions,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "An error occurred while processing grammar suggestions.",
    });
  }
};

// **CREATE** a new note
export const createNote = async (req, res) => {
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({
      error: "User not authenticated.",
    });
  }

  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      error: "All fields (title and content) are required.",
    });
  }

  if (typeof title !== "string" || typeof content !== "string") {
    return res.status(400).json({
      error: "Title and content must be strings.",
    });
  }

  try {
    const checkQuery = `
      SELECT id 
      FROM markdownnotes
      WHERE title = $1 AND user_id = $2;
    `;
    const checkResult = await pool.query(checkQuery, [title, user_id]);

    if (checkResult.rowCount > 0) {
      return res.status(400).json({
        error:
          "Title already exists. Change the title or update the existing note.",
      });
    }

    const insertQuery = `
      INSERT INTO markdownnotes (user_id, title, content)
      VALUES ($1, $2, $3)
      RETURNING id, created_at;
    `;
    const result = await pool.query(insertQuery, [user_id, title, content]);

    if (result.rowCount === 0) {
      throw new Error("Note creation failed.");
    }

    return res.status(201).json({
      message: "Note created successfully.",
      note: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating note:", error.message);

    if (error.message.includes("uuid")) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    return res.status(500).json({ error: "Internal server error." });
  }
};

// get all the notes
export const getAllNotes = async (req, res) => {
  const user_id = req.user?.id;
  if (!user_id) {
    return res.status(400).json({
      message: "login to get all notes",
    });
  }

  try {
    const query = `
      SELECT id, title, content, created_at, updated_at 
      FROM markdownnotes
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [user_id]);

    res.status(200).json({
      message: "Notes retrieved successfully.",
      notes: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving notes:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

// get note by id
export const getNoteById = async (req, res) => {
  const user_id = req.user?.id;
  const { id } = req.params;

  if (!user_id) {
    return res.status(400).json({
      error: "User not authenticated.",
    });
  }

  try {
    const query = `
    SELECT id, title, content, created_at, updated_at
    FROM markdownnotes
    WHERE id = $1 AND user_id = $2;
  `;
    const result = await pool.query(query, [id, user_id]);

    if (result.rowCount === 0) {
      console.log("Note not found for ID =", id, "and User ID =", user_id);
      return res.status(404).json({ error: "Note not found." });
    }

    res.status(200).json({
      message: "Note retrieved successfully.",
      note: result.rows[0],
    });
  } catch (error) {
    console.error("Error retrieving note:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

// update the notes
export const updateNote = async (req, res) => {
  const user_id = req.user?.id;
  const { id } = req.params;

  if (!user_id) {
    return res.status(400).json({
      error: "User not authenticated.",
    });
  }
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      error: "All fields (title and content) are required.",
    });
  }

  try {
    const query = `
      UPDATE markdownnotes
      SET title = $1, content = $2, updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING id, title, content, created_at, updated_at;
    `;
    const result = await pool.query(query, [title, content, id, user_id]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Note not found or not authorized to update." });
    }

    res.status(200).json({
      message: "Note updated successfully.",
      note: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating note:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

// delete the note
export const deleteNote = async (req, res) => {
  const user_id = req.user?.id;
  const { id } = req.params;

  if (!user_id) {
    return res.status(400).json({
      error: "User not authenticated.",
    });
  }

  try {
    const query = `
      DELETE FROM markdownnotes
      WHERE id = $1 AND user_id = $2
      RETURNING id;
    `;
    const result = await pool.query(query, [id, user_id]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Note not found or not authorized to delete." });
    }

    res.status(200).json({
      message: "Note deleted successfully.",
      deletedNoteId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error deleting note:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

// render Markdown to HTML endpoint
// ---further add html customization
export const renderMarkdownToHTML = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({
      error: "User not authenticated.",
    });
  }

  try {
    const query = `
      SELECT content
      FROM markdownnotes
      WHERE id = $1 AND user_id = $2;
    `;
    const result = await pool.query(query, [id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Note not found." });
    }

    const { content } = result.rows[0];

    const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
    const renderedHTML = md.render(content);

    return res.status(200).json({
      message: "Markdown rendered successfully.",
      html: renderedHTML,
    });
  } catch (error) {
    console.error("Error rendering Markdown to HTML:", error.message);
    return res.status(500).json({ error: "Internal server error." });
  }
};
