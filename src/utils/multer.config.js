import multer from "multer";
import path from "path";

// Configure memory storage for Multer
const storage = multer.memoryStorage();

// Define file filter to validate file extensions
const fileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".md", ".txt", ".docx"];

    if (!allowedExtensions.includes(ext)) {
      return cb(
        new Error(
          "Only Markdown (.md), (.docx) or Text (.txt) files are allowed!"
        ),
        false
      );
    }

    cb(null, true);
  } catch (error) {
    cb(
      new Error("An unexpected error occurred during file validation."),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // Limit file size to 1 MB
  },
});

export default upload;
