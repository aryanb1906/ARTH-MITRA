# Front-End Improvement Opportunities

This review focuses on practical, high-impact improvements and exactly where to make them.

## 1) Remove dead code and unused imports

- **Where:** `frontend/app/page.tsx`
- **Current issue:** `useEffect` and `useState` are imported but only used in commented-out backend test code.
- **Why improve:** Reduces bundle noise and keeps page intent clear.
- **Suggested change:** Remove unused React imports and the commented-out backend test block, or move test logic to a dedicated debug utility.

## 2) Fix brittle “suggested query” send flow

- **Where:** `frontend/app/chat/page.tsx` in `handleSuggestedQuery`
- **Current issue:** It sets input and dispatches a synthetic keyboard event on `document.querySelector('input')`.
- **Why improve:** This can break when multiple inputs exist and is hard to reason about.
- **Suggested change:** Refactor `handleSendMessage` to accept an optional string (e.g., `handleSendMessage(text?: string)`), then call it directly from suggestion clicks.

## 3) Replace deprecated keyboard handler

- **Where:** `frontend/app/chat/page.tsx` on the chat `<Input>` component
- **Current issue:** Uses `onKeyPress`, which is deprecated in React.
- **Why improve:** Future compatibility and cleaner key handling.
- **Suggested change:** Use `onKeyDown` with the same Enter behavior.

## 4) Improve accessibility for icon-only controls

- **Where:** `frontend/app/chat/page.tsx`
- **Current issue:** Icon buttons (upload, refresh, bookmark) rely on `title` or visual context only.
- **Why improve:** Screen readers need explicit labels.
- **Suggested change:** Add `aria-label` for icon-only controls and ensure interactive elements have clear focus-visible styles.

## 5) Move hardcoded user/session data to state source

- **Where:** `frontend/app/chat/page.tsx` (`profile`, `recentQueries`, initial assistant message)
- **Current issue:** Values are hardcoded in the component body.
- **Why improve:** Limits personalization and maintainability.
- **Suggested change:** Pull from API/session storage and persist recent queries + bookmarks (localStorage or backend).

## 6) Add robust API error normalization

- **Where:** `frontend/lib/api.ts` (`sendMessage`, `uploadDocument`)
- **Current issue:** Error states collapse to generic copy in UI.
- **Why improve:** Better UX and supportability.
- **Suggested change:** Normalize errors in `lib/api.ts` (HTTP status, timeout, network) and return user-safe messages + debug metadata.

## 7) Add loading/empty/error state patterns for navigation CTAs

- **Where:** `frontend/app/page.tsx` (hero CTA “Watch Demo Video”)
- **Current issue:** CTA is visible but non-functional (placeholder comment).
- **Why improve:** Prevents user confusion.
- **Suggested change:** Either wire to a modal/video link or hide until available; avoid inert primary CTAs.

## 8) Improve maintainability by splitting oversized page components

- **Where:** `frontend/app/chat/page.tsx`, `frontend/app/page.tsx`
- **Current issue:** Large monolithic page components mix data, view logic, and rendering.
- **Why improve:** Easier testing, readability, and incremental feature delivery.
- **Suggested change:** Extract sections into focused components (e.g., `ChatHeader`, `MessageList`, `SuggestionGrid`, `Sidebars`) and isolate hook logic in `hooks/`.

## 9) Add front-end quality guardrails

- **Where:** `frontend/` project setup
- **Current issue:** No visible component tests/e2e coverage for key flows.
- **Why improve:** Prevents regressions in chat send/upload interactions.
- **Suggested change:** Add lightweight coverage for:
  - chat submit behavior
  - suggestion click behavior
  - upload success/failure messaging
  - bookmark toggling

## Suggested implementation order

1. Quick wins: items **1, 3, 4, 7**.
2. UX stability: items **2, 6**.
3. Structural improvements: items **5, 8, 9**.
