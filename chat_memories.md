# Chat Memories

## Workspace Context
- **Repository**: Nexa Platform (`Icedmist/nexafinal`)
- **Git User**: `icedmist` (`talk2icedmist@gmail.com`)
- **Default / Active Working Branch**: `feature/system-admin-workflow`

## User Rules & Guidelines
- Always store chat memories.
- Stick strictly to user requirements.
- Never run browser agent.
- Adhere to the mandatory agent workflow:
  1. Check existing issues or create new GitHub issue with `gh issue create`.
  2. Sync base branch and create dedicated branch.
  3. Verify static analysis and build (`tsc --noEmit` and `npm run build`).
  4. Use conventional commits with user git credentials (`icedmist` / `talk2icedmist@gmail.com`).
  5. Push dedicated branch to remote.
  6. Create Pull Request linked to the issue.
  7. Wait for CI / Vercel checks, squash and merge PR, delete remote branch.
  8. Return to base branch and pull latest changes.
  9. Update `progress.md` and `chat_memories.md`.

## Work History & Completed Tasks

### Task: Deleted Store Slug & Account Lockout + Restore
- **Date**: 2026-11-01
- **Branch**: `feature/system-admin-workflow`
- **Commit Hash**: `dff79d5`
- **Key Changes**:
  1. **Admin-SDK Deletion**: Added the `deletestore` callable to cascade every store-owned collection, delete nested store subcollections, write a `deletedStores` tombstone plus `deletedSlugs` and `deletedStoreMarkers` indexes, delete the store document, and lock every associated account.
  2. **Account Lockout**: Disables each Auth user, revokes refresh tokens, replaces claims with `{ role: "suspended", storeSuspended: true, deletedStoreId }`, and removes their orphaned user/staff profiles. Firestore rules now require the store document to exist before a store claim grants access, so stale ID tokens lose access immediately.
  3. **Restore Flow**: Added the `restorestore` callable and a Deleted Stores panel in the system admin registry to recreate the store, restore staff/user profiles, re-enable accounts with their original claims, and release the slug.
  4. **Slug Protection**: Provisioning and onboarding reject tombstoned slugs; Firestore rules also block creating a store with a retired slug or a tombstoned store id.
  5. **Client Enforcement**: Auth signs out sessions carrying a deleted-store marker, tenant/profile caches are cleared, and `BusinessContext`/`RoleContext`/`AppLayout` block deleted-store workspaces.

### Task: Modal Centering, Role Navigation Blocking & Permanent Store Deletion
- **Date**: 2026-10-31
- **GitHub Issue**: [#10](https://github.com/Icedmist/nexafinal/issues/10)
- **Pull Request**: [#11](https://github.com/Icedmist/nexafinal/pull/11)
- **Commit Hash**: `929cb03`
- **Key Changes**:
  1. **Centered Modals**: Fixed modals for adding and managing suppliers (`SupplierFormSheet`, `SupplierDetailSheet`), restocking purchase orders (`RestockingFormSheet`, `RestockingDetailSheet`), receiving shipments (`ReceiveShipmentSheet`), and catalog items (`ItemFormSheet`, `ItemDetailSheet`) getting stuck or truncated at the bottom of the page. Enforced `max-h-[90dvh]`, sticky headers, inner scrollable bodies (`flex-1 min-h-0 overflow-y-auto`), and `max-h-[90dvh] overflow-y-auto` defaults in `DialogContent` (`src/components/ui/dialog.tsx`).
  2. **Role Navigation Blocking**: Blocked sections and pages from showing in `Sidebar` and `BottomNav` if a user's role or permissions do not permit viewing them. Filtered standalone links and nav items with `canAccessRoute(href, role)` and `permissions[permKey]`. Blocked `/app/ecommerce` access from `staff` role in `route-guard.ts`.
  3. **Permanent Store Deletion**: Implemented `deleteStorePermanently` in `src/lib/store-deletion.ts` cascading across all store-scoped Firestore collections (products, sales, customers, staff, locations, purchase orders, credit, etc.), keyed documents (`businesses`, `moniepoint_accounts`), and prefixed records (`engagementStreaks`). Integrated in `system-admin.businesses.tsx` with confirmation prompts, deletion progress toast, and automatic registry reload.
  4. **Build & Config Fixes**: Added missing `CreditCard` import in `BusinessOnboarding.tsx` and cleaned uninstalled `html2canvas` entry in `vite.config.ts`.
