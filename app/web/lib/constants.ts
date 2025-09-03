export const TABLES = {
  userRoles: "user_roles",
  roles: "roles",
  taskInstances: "task_instances",
} as const;

export const todayString = () => new Date().toISOString().slice(0, 10);
