/**
 * agent-audit: every action generates an event.
 *
 *   await audit.log({
 *     agentId,
 *     sessionId,
 *     action: "send_email",
 *     input,
 *     output,
 *     status: "success",
 *     durationMs,
 *   });
 */

export type AgentEventType =
  | "run_started"
  | "tool_called"
  | "tool_completed"
  | "approval_requested"
  | "approval_completed"
  | "run_completed"
  | "run_failed"
  | "memory_written"
  | "memory_retrieved";

export type AgentEventStatus = "success" | "error" | "pending" | "denied";

export type AgentEvent = {
  id: string;
  agentId: string;
  sessionId: string;
  type: AgentEventType;
  action?: string;
  input?: unknown;
  output?: unknown;
  status?: AgentEventStatus;
  durationMs?: number;
  error?: { code?: string; message: string };
  metadata?: Record<string, unknown>;
  timestamp: string;
};

export type AuditSink = {
  write(event: AgentEvent): Promise<void> | void;
};

export type AuditLogger = {
  log(event: Omit<AgentEvent, "id" | "timestamp"> & Partial<Pick<AgentEvent, "id" | "timestamp">>): Promise<AgentEvent>;
  /** All buffered events (in-memory sink). */
  events(): AgentEvent[];
  /** Filter buffered events. */
  filter(predicate: (event: AgentEvent) => boolean): AgentEvent[];
  /** Flush to any registered sinks. */
  flush(): Promise<void>;
};

export function createAudit(options: {
  agentId?: string;
  sessionId?: string;
  sinks?: AuditSink[];
  /** Cap the in-memory buffer (oldest dropped). Default 5000. */
  bufferSize?: number;
} = {}): AuditLogger {
  const buffer: AgentEvent[] = [];
  const sinks = options.sinks ?? [];
  const bufferSize = options.bufferSize ?? 5000;
  let counter = 0;

  return {
    async log(partial) {
      const event: AgentEvent = {
        id: partial.id ?? `evt_${Date.now().toString(36)}_${(++counter).toString(36)}`,
        timestamp: partial.timestamp ?? new Date().toISOString(),
        agentId: partial.agentId ?? options.agentId ?? "agent",
        sessionId: partial.sessionId ?? options.sessionId ?? "session",
        type: partial.type,
        ...(partial.action !== undefined ? { action: partial.action } : {}),
        ...(partial.input !== undefined ? { input: partial.input } : {}),
        ...(partial.output !== undefined ? { output: partial.output } : {}),
        ...(partial.status !== undefined ? { status: partial.status } : {}),
        ...(partial.durationMs !== undefined ? { durationMs: partial.durationMs } : {}),
        ...(partial.error !== undefined ? { error: partial.error } : {}),
        ...(partial.metadata !== undefined ? { metadata: partial.metadata } : {}),
      };
      buffer.push(event);
      if (buffer.length > bufferSize) buffer.splice(0, buffer.length - bufferSize);
      for (const sink of sinks) {
        try {
          await sink.write(event);
        } catch {
          // auditing must never break the agent
        }
      }
      return event;
    },
    events: () => [...buffer],
    filter: (predicate) => buffer.filter(predicate),
    async flush() {
      for (const sink of sinks) {
        for (const event of buffer) {
          try {
            await sink.write(event);
          } catch {
            /* ignore */
          }
        }
      }
    },
  };
}

/** Console sink for quick demos. */
export function consoleSink(label = "audit"): AuditSink {
  return {
    write(event) {
      // eslint-disable-next-line no-console
      console.log(`[${label}] ${event.timestamp} ${event.type} ${event.action ?? ""} ${event.status ?? ""}`);
    },
  };
}

/** Collects events in an array you can assert on in tests. */
export function memorySink(): AuditSink & { events: AgentEvent[] } {
  const events: AgentEvent[] = [];
  return {
    events,
    write(event) {
      events.push(event);
    },
  };
}