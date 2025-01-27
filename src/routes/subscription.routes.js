import { Router } from "express";
import { toggleSubscription } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//secured routes
router.route("/:channel").put(verifyJWT, toggleSubscription);

export default router;
