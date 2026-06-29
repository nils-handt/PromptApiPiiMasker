# Agent Notes

## Chrome Prompt API Workflow

- Codex's built-in in-app browser does not expose Chrome's Prompt API. Use the `@chrome` plugin with the Codex Chrome Extension when live Prompt API feedback is needed.
- The app may be reachable at `http://localhost:5173/` even when `http://127.0.0.1:5173/` refuses connections, depending on how the dev server is bound.
- In Chrome, the app can report `Prompt API status: Chrome Prompt API model is ready.` even though the extension's read-only evaluation sandbox cannot directly see `LanguageModel`; trust the page UI and app behavior for this check.
- File upload through the Chrome plugin requires the Codex extension setting `Allow access to file URLs`. If chooser uploads fail with `Not allowed`, enable that setting at `chrome://extensions` under the Codex extension details.
- Verified end-to-end workflow: upload a JSON file, click `Run Prompt API analysis`, and inspect the app UI for `Total findings` plus the generated finding rows.
