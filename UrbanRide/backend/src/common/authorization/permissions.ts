export type Permission = string;

// Permission values and role mappings will be defined with their owning modules.
export interface PermissionRequirement {
  allOf?: readonly Permission[];
  anyOf?: readonly Permission[];
}
