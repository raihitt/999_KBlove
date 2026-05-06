# Codex App Server Operational Notes

## Current decision

The GitHub Actions review workflow is disabled for automatic pull request events.
Reason: the `openai/codex-action` path requires an API key and therefore uses API billing, which does not match a ChatGPT Plus only operating model.

## What Codex App Server is

Codex App Server is the Codex harness exposed over a bidirectional JSON-RPC API.
OpenAI's published guidance describes it as the integration layer behind Codex surfaces and notes that it can be started with `codex mcp-server` for stdio-based clients.

This is useful when you want to build your own client workflow around Codex rather than run headless GitHub Actions jobs.

## Recommended operating model for this repo

Use ChatGPT Plus based Codex manually from the app or CLI for pull request review, and defer full GitHub-side automation until there is an official non-API-billed path for unattended CI usage.

### Target workflow

1. Developer opens or updates a PR.
2. Reviewer opens the repo locally at `/Users/raihi/local_repo/350_Certicake/`.
3. Reviewer runs Codex from the app or CLI against the local checkout and asks it to review the PR diff.
4. Reviewer copies the findings into GitHub, or uses a local helper later if a supported authenticated integration becomes available.

This keeps usage inside the ChatGPT/Codex product surface instead of routing through API-key-based GitHub Actions.

## Practical introduction path

### Phase 1: manual App/CLI usage

- Keep review execution local.
- Standardize one review prompt for this repository.
- Review only PR diffs and prioritize logic bugs, regressions, security issues, and missing tests.

Suggested prompt:

```text
Review only the current PR diff for /Users/raihi/local_repo/350_Certicake/.
Prioritize logic bugs, regressions, security issues, and missing tests.
Ignore style-only suggestions unless they hide a real defect.
Return concise findings with file references and concrete risk.
If no meaningful issues are found, say: No meaningful concerns.
```

### Phase 2: local App Server evaluation

- Install and authenticate the Codex CLI with the same ChatGPT account used for Codex.
- Start the App Server locally with `codex mcp-server`.
- Connect a local client that can speak stdio/MCP or JSON-RPC through the supported adapter path.
- Verify that the local client can:
  - inspect the current repository
  - run a review prompt
  - return structured findings

This phase is for workflow experimentation, not unattended GitHub automation.

### Phase 3: integration decision

Only proceed to deeper integration if one of these becomes true:

- OpenAI provides an officially supported GitHub automation path that uses ChatGPT/Codex subscription auth instead of API billing.
- You decide the automation value is worth API billing.
- You need a custom internal review console or multi-step review workflow that justifies building around App Server.

## Why App Server does not replace the billing constraint by itself

App Server is an integration interface, not a separate billing bypass.
It helps you build your own Codex client experience, but it does not turn GitHub Actions into a ChatGPT Plus authenticated service by itself.
For unattended PR automation on GitHub, the current official path still uses API-key-backed execution.

## Recommended next actions

1. Keep the GitHub workflow disabled.
2. Trial manual PR review in Codex app or CLI for several pull requests.
3. Measure review quality and operator effort.
4. Revisit automation only if the billing model or official integration options change.
