import express from "express";
import { signup, login, logout } from "../controllers/user.controller.js";
import { checkAndRenewToken } from "../middleware/validateToken.js";

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.get("/logout", checkAndRenewToken, logout);

export default userRouter;
