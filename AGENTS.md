<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Guest data (ingredients, favorites, regular dishes, liked IDs, nickname) lives in browser localStorage through `src/lib/local-store.ts` (safe read/validate/write + cross-tab sync) and `useLocalState`/the ingredient adapter, which never write before the stored value is loaded; this keeps refreshes from wiping data and lets storage be swapped for a database later without touching UI.
- Community recipes live in the `community_recipes` table (public read + anonymous insert, no login); likes/views change only through `like_community_recipe` / `view_community_recipe` DB functions and an insert trigger forces counts to 0, so clients cannot fake counts. Per-browser liked IDs and nickname stay in localStorage.
- Recipe recommendations run in a server function (`src/lib/recipes.functions.ts`) through the AI gateway with a zod schema, so the key and prompt never reach the browser.
- Expiring-soon ingredient flags are a separate localStorage list next to the ingredient list (same storage adapter), and AI priority wording/sorting lives in pure `src/lib/recipe-prompt.ts` so it is unit-tested and shared by server and browser.
- Cooking mode timers are parsed from step text (`src/lib/cooking.ts`), so the AI prompt must keep asking for explicit times like "7분" in waiting steps.
- Login state comes from one `AuthProvider` (`src/hooks/use-auth.tsx`) mounted in `__root`, the only `onAuthStateChange` subscriber; UI reads it via `useAuth()`, and auth error wording/display name live in pure `src/lib/auth-messages.ts` so they are unit-tested.
- Signed-in kitchen data (ingredients + urgent flag, favorites, own recipes) lives in `user_ingredients` / `user_favorites` / `user_regulars` (owner-only RLS). The same hooks (`useIngredients`, `useFavorites`, `useRegulars`) switch between localStorage (guest) and Cloud (signed in) via `useCloudKitchen` (one React Query cache per user, optimistic update + rollback), so UI never branches on login; guest→account merge rules live in pure `src/lib/kitchen.ts` and are unit-tested. Hook tests must wrap in a `QueryClientProvider`.
