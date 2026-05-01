import { getProfile, updateProfile } from "../services/profileService.js";
import { getDailyUsageStreakHistory } from "../services/usageStreakService.js";

export async function getProfileController(req, res) {
  const profile = await getProfile(req.user.id);
  res.json({
    ...profile,
    daily_usage_streak: req.user.usageStreak ?? 0
  });
}

export async function updateProfileController(req, res) {
  const profile = await updateProfile(req.user.id, req.body);
  res.json({
    ...profile,
    daily_usage_streak: req.user.usageStreak ?? 0
  });
}

export async function getProfileStreakHistoryController(req, res) {
  const windowDays = Number(req.query.windowDays);
  const streakHistory = await getDailyUsageStreakHistory(req.user.id, windowDays);
  res.json(streakHistory);
}
