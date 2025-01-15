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

export { app };
