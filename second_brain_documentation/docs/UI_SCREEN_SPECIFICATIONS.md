# UI Screen Specifications

## 1. Workspace shell
Desktop regions: collapsible sidebar, top navigation/search affordance, document content region. Keep the editor dominant.
States: loading skeleton, empty workspace, normal, offline, session expired, recoverable error.

## 2. Sidebar
Contains workspace name, search, create-page action, favorites, recent pages, hierarchical page tree, archive/trash access, settings. Page rows support expand/collapse, context menu, selection, keyboard navigation, and accessible touch actions. Never make drag-and-drop the only way to move pages.

## 3. Page editor
Top: breadcrumb, optional page icon/cover, title, metadata/action menu. Body: ordered block list. Each block has type-appropriate editing and action controls. Provide save status and conflict/error messages. Long documents must remain usable without heavy UI chrome.

## 4. Slash menu
Triggered by `/` at an eligible insertion point. Searchable list of supported block types. Keyboard arrows, Enter, Escape; touch users receive an equivalent insertion menu. Do not intercept slash in code blocks or contexts where it is literal text unless the editor behavior explicitly supports it.

## 5. Search
Global command/dialog or dedicated screen. Query field, results list, snippet, page location, loading/no-results/error states. Debounce and cancel stale queries. Server enforces access control.

## 6. Favorites and recent
Simple lists of pages; recent ordering based on a documented last-opened/last-edited policy. Empty states link to workspace creation/search.

## 7. Trash/archive
Clearly distinguish archived from deleted items. Show restore and permanent delete actions with confirmation. Document retention policy; do not imply a backup exists merely because an item is in trash.

## 8. Settings
Theme, export, account/session, MCP connection instructions/status if supported, and app version. Never display secrets after initial entry.

## 9. Attachments
Upload progress, retry, unsupported-file state, access denied, expired signed URL, and deleted attachment states. Private files must not be exposed through public buckets.

## 10. Flutter navigation
Use a mobile-appropriate navigation drawer/screen rather than compressing desktop sidebar. Editor actions should use touch-friendly menus and preserve content focus. Android is the initial target; document platform-specific differences.

## 11. Shared states
Every network-backed screen defines loading, success, empty, validation failure, authorization failure, network failure, and stale/conflict states. Use consistent labels and recovery actions.
