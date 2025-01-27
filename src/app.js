import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); // to let express know that json data is coming
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // to let express know that url encoded data is coming
app.use(express.static("public")); // to serve static files
app.use(cookieParser()); // to parse cookies securely from server to client

// route imports
import userRoutes from "./routes/user.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";

// route middlewares
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);

export { app };
