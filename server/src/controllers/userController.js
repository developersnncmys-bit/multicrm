// /api/users — staff accounts. Everyone signed in can list users (names/avatars in the UI);
// only an Admin can create, change or delete them. Users may edit their own name/phone/password.
import { User } from "../models/index.js";
import { isAdmin } from "../middleware/permission.js";
import { asyncHandler, httpError, toClient, fromClient } from "../utils/helpers.js";

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ _ord: 1 }).lean();
  res.json(users.map(toClient));
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.params.id }).lean();
  if (!user) throw httpError(404, "User not found");
  res.json(toClient(user));
});

export const createUser = asyncHandler(async (req, res) => {
  const { password, ...data } = fromClient(req.body);
  if (!data.id) throw httpError(400, "Record needs an id");
  const user = new User(data);
  await user.setPassword(password);
  await user.save();
  res.status(201).json(toClient(user));
});

export const updateUser = asyncHandler(async (req, res) => {
  const self = req.params.id === req.user.id;
  if (!isAdmin(req.user) && !self) throw httpError(403, "Only an Admin can manage users.");
  const { password, id, ...patch } = fromClient(req.body);
  if (!isAdmin(req.user)) { delete patch.role; delete patch.modules; delete patch.active; delete patch.email; } // no self-promotion
  if (self && isAdmin(req.user) && patch.role && patch.role !== "Admin") throw httpError(400, "You can't remove your own admin role.");
  const user = await User.findOne({ id: req.params.id });
  if (!user) throw httpError(404, "User not found");
  user.set(patch);
  if (password) await user.setPassword(password);
  await user.save();
  res.json(toClient(user));
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw httpError(400, "You can't delete your own account.");
  const { deletedCount } = await User.deleteOne({ id: req.params.id });
  if (!deletedCount) throw httpError(404, "User not found");
  res.json({ ok: true });
});
