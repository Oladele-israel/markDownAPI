import jwt from "jsonwebtoken";
import pool from "../utils/db.js";

export const checkAndRenewToken = async (req, res, next) => {
  try {
    const { Juice: accessToken, Sauce: refreshToken } = req.cookies;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: "No token provided" });
    }

    const verifyToken = (token, secret) =>
      new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded);
        });
      });

    let userId;

    if (accessToken) {
      try {
        const decoded = await verifyToken(
          accessToken,
          process.env.ACCESS_TOKEN_SECRET
        );
        userId = decoded.access2;
      } catch (err) {
        return res
          .status(401)
          .json({ message: "Access token expired or invalid" });
      }
    }

    if (!userId && refreshToken) {
      try {
        const decoded = await verifyToken(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );
        userId = decoded.access2;

        const userResult = await pool.query(
          "SELECT id, username FROM users WHERE id = $1",
          [userId]
        );
        const user = userResult.rows[0];
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        const newAccessToken = jwt.sign(
          { access1: user.username, access2: user.id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        res.cookie("Juice", newAccessToken, {
          httpOnly: true,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          maxAge: 15 * 60 * 1000,
        });

        req.user = user;
      } catch (err) {
        return res
          .status(401)
          .json({ message: "Refresh token expired or invalid" });
      }
    }

    if (userId) {
      const userResult = await pool.query(
        "SELECT id, username FROM users WHERE id = $1",
        [userId]
      );
      const user = userResult.rows[0];
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      req.user = user;
    } else {
      return res.status(401).json({ message: "Authentication failed" });
    }

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
