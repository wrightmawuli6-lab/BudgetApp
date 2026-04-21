import { registerUser, loginUser } from "../services/authService.js";

export async function registerController(req, res) {
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function loginController(req, res) {
  const result = await loginUser(req.body);
  res.status(200).json(result);
}