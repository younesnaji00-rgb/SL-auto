import { BRAND } from '../brand';

/**
 * Whether the guided tutorials are offered to a user with this role.
 * Dependency-light (relative import only) so both React components and the
 * tour engine can use it.
 *
 * `role` is null/undefined when unknown (login page, profile still loading):
 * a role-restricted brand hides the tutorials until the role is known.
 */
export function tutorialsEnabledFor(role: string | null | undefined): boolean {
  if (!BRAND.showTutorials) return false;
  if (!BRAND.tutorialRoles) return true;
  return !!role && BRAND.tutorialRoles.includes(role);
}
