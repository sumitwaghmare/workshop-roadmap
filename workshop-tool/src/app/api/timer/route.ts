import { NextResponse } from "next/server";
import { timerStore } from "@/lib/timer-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const timer = timerStore.getTimer(sessionId);
  return NextResponse.json(timer);
}

export async function POST(req: Request) {
  const { sessionId, action, duration } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const current = timerStore.getTimer(sessionId);
  let updates = {};

  switch (action) {
    case "START":
      updates = {
        status: "running",
        startedAt: Date.now(),
      };
      break;
    case "PAUSE":
      if (current.status === "running" && current.startedAt) {
        const elapsed = Math.floor((Date.now() - current.startedAt) / 1000);
        updates = {
          status: "paused",
          elapsedAtPause: current.elapsedAtPause + elapsed,
          startedAt: null,
        };
      }
      break;
    case "RESUME":
      updates = {
        status: "running",
        startedAt: Date.now(),
      };
      break;
    case "STOP":
    case "RESET":
      updates = {
        status: "stopped",
        startedAt: null,
        elapsedAtPause: 0,
      };
      break;
    case "SET_DURATION":
      if (typeof duration === "number") {
        updates = {
          duration,
          status: "stopped",
          startedAt: null,
          elapsedAtPause: 0,
        };
      }
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = timerStore.updateTimer(sessionId, updates);
  return NextResponse.json(updated);
}
