# Agent Audit

Structured event log for every agent action: runs, tool calls, approvals, memory writes.

TypeScript package `agent-audit`.

## Install

```sh
npm install github:theAliCanAcar/agent-audit#main
```

## How to use

```ts
import { createAudit, consoleSink, memorySink } from 'agent-audit';

const sink = memorySink();
const audit = createAudit({ agentId: 'demo', sinks: [consoleSink(), sink] });
await audit.emit({ type: 'run_started', at: new Date().toISOString() });
console.log(sink.events);
```

## Use cases

### 1. Trace a failed run

- **Scenario:** A customer says the agent did the wrong thing.
- **Outcome:** Replay run_started, tool_called, and run_completed events from a sink.

### 2. Pipe events to console during demos

- **Scenario:** You want live visibility while developing.
- **Outcome:** Attach consoleSink (or a custom sink) without changing agent code.

## Dependencies

No package dependencies.

## Scripts

```sh
npm install
npm run build
```

## Notes

- Keep API keys in environment variables or a gitignored `.env`. Never commit secrets.
- Side-effecting tools should go through approval when used with `agent-approval`.
- Related packages live in separate repositories under [theAliCanAcar](https://github.com/theAliCanAcar).

## License

MIT
