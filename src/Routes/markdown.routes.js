import express from "express";
import { uploadFile } from "../controllers/markdown.controller.js";
import upload from "../utils/multer.config.js";
import { checkAndRenewToken } from "../middleware/validateToken.js";

const markdownRouter = express.Router();

markdownRouter.post(
  "/upload",
  upload.single("file"),
  checkAndRenewToken,
  uploadFile
);

export default markdownRouter;
