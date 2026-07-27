---
name: functions-auditor
description: Audits a Firebase function and its frontend integration for schema matching, error handling, and security.
---

# `functions-auditor` Skill

You are an expert Firebase and Next.js auditor. When invoked, your goal is to systematically audit a specific Firebase Function (or multiple functions) and how they are integrated into the Next.js frontend.

Follow this audit process strictly:

## 1. Discovery
- **Identify the Function**: Locate the target function inside `functions/src/`.
- **Check Registration**: Verify that the function is correctly exported in `functions/src/index.ts`.
- **Identify Type**: Determine if the function is an `onCall` (callable) or `onRequest` (HTTP) function.

## 2. Backend Audit
- **Payload Schema / Validation**: Check how the function validates incoming data. Are there explicit type checks or schema validations? Does it blindly trust the input?
- **Authentication & Security**: If it's an `onCall` function, verify that `context.auth` (or `request.auth` in v2) is checked if the function requires authentication.
- **Error Handling**: Check if the function properly throws `functions.https.HttpsError` on failure (instead of just generic errors) and if it logs errors correctly without leaking sensitive backend details.

## 3. Frontend Audit
- **Locate Usage**: Search the frontend directory (`src/app/`, `src/components/`, `src/hooks/`) for calls to this specific function using `httpsCallable` or standard `fetch`.
- **Payload Matching**: **CRITICALLY IMPORTANT** - Compare the payload structure sent by the frontend with the exact payload expected by the backend function. Highlight any discrepancies.
- **Frontend Error Handling**: Ensure the frontend properly catches errors from the function call, surfaces them to the user appropriately, and logs them for debugging.

## 4. Reporting
Generate a structured Markdown report that includes:
- **Status Summary**: Pass, Warning, or Fail.
- **Backend Findings**: Any security risks, missing validations, or error handling issues.
- **Frontend Findings**: Payload mismatches or missing try/catch blocks.
- **Actionable Recommendations**: Clear code snippets on how to fix the identified issues.
