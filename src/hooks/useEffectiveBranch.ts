import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useRole } from "@/hooks/useRole";

/**
 * Branch-operation context for the current user.
 *
 * Store admins and owners are allowed to "jump" into any branch of their own
 * store via BusinessContext.activeBranchId. When such an override is set
 * (`canJumpBranch === true`), all reads and writes scope to that branch — the
 * same as a branch-assigned manager.
 *
 * For admins/owners this is the key change: without an override they are global
 * (see everything); with an override they become branch-scoped so they can
 * operate inside the chosen branch. Managers/staff are deliberately excluded
 * from jumping, because a manager is hard-scoped to exactly one branch and that
 * isolation is a security boundary we must preserve.
 */
export function useEffectiveBranch() {
  const { activeBranchId } = useBusiness();
  const { claims } = useAuth();
  const { role } = useRole();

  // Only admins and owners may jump between branches of their own store.
  const canJumpBranch =
    (role === "admin" || role === "owner" ||
     claims?.role === "admin" || claims?.role === "owner") &&
    !!activeBranchId;

  // When not jumping, revert to the user's real branch claim.
  const effectiveBranchId = canJumpBranch
    ? activeBranchId
    : (claims?.branchId ?? null);

  return { effectiveBranchId, activeBranchId, isJumpBranch: canJumpBranch, canJumpBranch };
}