import { getProfile, updateProfile } from "../services/profileService.js";

export async function getProfileController(req, res) {
  const profile = await getProfile(req.user.id);
  res.json(profile);
}

export async function updateProfileController(req, res) {
  const profile = await updateProfile(req.user.id, req.body);
  res.json(profile);
}