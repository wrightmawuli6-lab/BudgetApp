export const ADMIN_PERMISSION_KEYS = [
  "users.read",
  "users.write",
  "roles.read",
  "roles.write",
  "audit.read",
  "settings.read",
  "settings.write",
  "transactions.read"
];

export const ADMIN_PERMISSION_DESCRIPTIONS = {
  "users.read": "Read admin users",
  "users.write": "Create and update admin users",
  "roles.read": "Read roles and role assignments",
  "roles.write": "Create roles and manage permissions",
  "audit.read": "Read admin audit logs",
  "settings.read": "Read system settings",
  "settings.write": "Update system settings",
  "transactions.read": "Read financial transaction data"
};

export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
