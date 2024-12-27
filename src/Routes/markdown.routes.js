import express from "express";
import {
  uploadFile,
  checkGrammar,
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
  renderMarkdownToHTML,
} from "../controllers/markdown.controller.js";
import upload from "../utils/multer.config.js";
import { checkAndRenewToken } from "../middleware/validateToken.js";

const markdownRouter = express.Router();

markdownRouter.post(
  "/upload",
  upload.single("file"),
  checkAndRenewToken,
  uploadFile
);

markdownRouter.post("/", checkAndRenewToken, createNote);
markdownRouter.get("/", checkAndRenewToken, getAllNotes);
markdownRouter.get("/:id", checkAndRenewToken, getNoteById);
markdownRouter.put("/:id", checkAndRenewToken, updateNote);
markdownRouter.delete("/:id", checkAndRenewToken, deleteNote);
markdownRouter.get("/render/:id", checkAndRenewToken, renderMarkdownToHTML);

markdownRouter.post("/checkgrammar", checkAndRenewToken, checkGrammar);

export default markdownRouter;
