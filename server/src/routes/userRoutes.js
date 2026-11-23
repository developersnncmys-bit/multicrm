import { Router } from "express";
import { listUsers, getUser, createUser, updateUser, deleteUser } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/permission.js";

const router = Router();
router.use(protect);
router.get("/", listUsers);
router.get("/:id", getUser);
router.post("/", adminOnly, createUser);
router.patch("/:id", updateUser); // admin, or the user editing their own profile (checked in controller)
router.delete("/:id", adminOnly, deleteUser);
export default router;
