# Action Tracker Pro

Simple React app to display action items from `gen-lang-client-0815432790.oberoiventures.actionitemstable`.

Getting started

1. Install deps: npm install
2. Run: npm run dev

Notes
- The data service will attempt to fetch from the env var `VITE_API_URL`. If not set or the request fails, it will use local mock data.
- The UI provides tabs for owners (Florence, Dan, Kams, Sunny) and an **Admin** tab. Click an owner tab to see only that owner's records; click **Admin** to view all data and use filters (Owner, Business Type, Status, Deadlines, Business).

- The table displays columns: ACTIONS, CREATE DATE, BUSINESS TYPE, BUSINESS, PROCESS, SUB-TYPE, DELIVERABLE, OWNER, DEADLINE, MIN, PRIORITY, STATUS.

To point to a real API endpoint, set VITE_API_URL when running the dev server:

Windows PowerShell example:

  $env:VITE_API_URL = "https://your-api.example.com/action_items"; npm run dev
