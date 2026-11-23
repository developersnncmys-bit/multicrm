// Builds the standard REST routes for one CRM resource:
//   GET / · GET /:id · POST / · PATCH /:id · DELETE /:id
// All require sign-in plus access to the resource's module.
import { Router } from "express";
import { makeCrudController } from "../controllers/crudController.js";
import { protect } from "../middleware/auth.js";
import { requireModule } from "../middleware/permission.js";

export function resourceRouter(Model, module) {
  const c = makeCrudController(Model);
  const router = Router();
  router.use(protect, requireModule(module));
  router.route("/").get(c.list).post(c.create);
  router.route("/:id").get(c.getOne).patch(c.update).delete(c.remove);
  return router;
}
