"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, AlertTriangle, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimerState {
  sessionId: string;
  duration: number;
  startedAt: number | null;
  elapsedAtPause: number;
  status: 'stopped' | 'running' | 'paused';
}

interface CountdownTimerProps {
  sessionId: string;
  variant?: 'fullscreen' | 'floating' | 'admin';
  onTimeUp?: () => void;
}

export default function CountdownTimer({ sessionId, variant = 'admin', onTimeUp }: CountdownTimerProps) {
  const [timer, setTimer] = useState<TimerState | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(`workshop-timer:${sessionId}`);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as TimerState;
    } catch {
      return null;
    }
  });
  const [remaining, setRemaining] = useState<number>(0);
  const [isUrgent, setIsUrgent] = useState(false);

  const syncInterval = variant === 'admin' ? 5000 : 30000;
  const isUninitializedTimer = (value: TimerState) => {
    return value.status === 'stopped' && value.startedAt === null && value.elapsedAtPause === 0 && value.duration === 300;
  };

  const fetchTimer = useCallback(async () => {
    try {
      const res = await fetch(`/api/timer?sessionId=${sessionId}`);
      if (res.ok) {
        const data: TimerState = await res.json();

        // Prevent transient in-memory server reset from clobbering a running client timer.
        if (timer && timer.status === 'running' && isUninitializedTimer(data) && !data.startedAt) {
          return;
        }

        setTimer(data);
        window.localStorage.setItem(`workshop-timer:${sessionId}`, JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to fetch timer", e);
    }
  }, [sessionId, timer]);

  useEffect(() => {
    let mounted = true;
    const initialFetch = async () => {
      if (mounted) await fetchTimer();
    };
    initialFetch();
    const interval = setInterval(fetchTimer, syncInterval); // Poll every 15s for non-admin clients, 2s for admin.
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchTimer, syncInterval]);

  useEffect(() => {
    if (!timer) return;

    const updateRemaining = () => {
      let elapsed = timer.elapsedAtPause;
      if (timer.status === 'running' && timer.startedAt) {
        elapsed += Math.floor((Date.now() - timer.startedAt) / 1000);
      }
      
      const rem = Math.max(0, timer.duration - elapsed);
      setRemaining(rem);
      setIsUrgent(rem > 0 && rem <= 60); // Last 60 seconds

      if (rem === 0 && timer.status === 'running') {
        onTimeUp?.();
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 100); // Fine-grained for UI
    return () => clearInterval(interval);
  }, [timer, onTimeUp]);

  if (!timer) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const getUrgencyClass = () => {
    if (remaining === 0) return "text-red-600 animate-pulse";
    if (isUrgent) return "text-red-500 animate-bounce";
    if (remaining <= 300) return "text-amber-500";
    return "text-blue-500";
  };

  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border bg-card/80 backdrop-blur-xl shadow-2xl transition-all hover:scale-105",
        isUrgent ? "border-red-500/50 shadow-red-500/20" : "border-border shadow-primary/10"
      )}>
        <div className={cn("flex items-center justify-center p-2 rounded-full", isUrgent ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500")}>
          <Clock className={cn("size-5", timer.status === 'running' && "animate-spin-slow")} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Session Ends In</span>
          <span className={cn("text-2xl font-black tabular-nums font-mono leading-none", getUrgencyClass())}>
            {timeStr}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-10">
        {/* Jazzy background glow */}
        <div className={cn(
          "absolute inset-0 opacity-20 blur-[100px] transition-all duration-1000",
          isUrgent ? "bg-red-600" : remaining === 0 ? "bg-red-900" : "bg-blue-600"
        )} />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-12">
          <h2 className="text-4xl font-extrabold uppercase tracking-[0.3em] text-muted-foreground animate-in fade-in zoom-in duration-500">
            Time Remaining
          </h2>
          
          <div className={cn(
            "text-[20rem] md:text-[30rem] font-black tabular-nums leading-none tracking-tighter drop-shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all font-mono",
            getUrgencyClass()
          )}>
            {timeStr}
          </div>

          {remaining === 0 && (
            <div className="text-6xl font-black text-red-500 animate-bounce uppercase">
              Time is Up!
            </div>
          )}

          {isUrgent && remaining > 0 && (
            <div className="flex items-center gap-4 text-3xl font-bold text-red-500 animate-pulse">
              <AlertTriangle className="size-10" />
              <span>HURRY UP! WRAP IT UP!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin controls variant
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 rounded-2xl border border-border bg-card/50 glass">
        <div className="flex items-center gap-4">
          <div className={cn("p-4 rounded-3xl", isUrgent ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500")}>
            <Clock className={cn("size-8", timer.status === 'running' && "animate-spin-slow")} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Current Session Timer</span>
            <div className={cn("text-6xl font-black tabular-nums font-mono", getUrgencyClass())}>
              {timeStr}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetch("/api/timer", { method: "POST", body: JSON.stringify({ sessionId, action: timer.status === 'running' ? "PAUSE" : "START" }) }).then(fetchTimer)}
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl transition-all hover:scale-105 active:scale-95",
              timer.status === 'running' ? "bg-amber-500 text-amber-950 shadow-amber-500/20" : "bg-green-500 text-green-950 shadow-green-500/20",
              "shadow-xl"
            )}
            title={timer.status === 'running' ? 'Pause' : 'Start'}
          >
            {timer.status === 'running' ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current ml-1" />}
          </button>
          
          <button 
            onClick={() => fetch("/api/timer", { method: "POST", body: JSON.stringify({ sessionId, action: "RESET" }) }).then(fetchTimer)}
            className="flex size-14 items-center justify-center rounded-2xl bg-muted border border-border hover:bg-muted/80 transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="Reset"
          >
            <RotateCcw className="size-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[15, 65, 125, 35].map(mins => (
          <button
            key={mins}
            onClick={() => fetch("/api/timer", { method: "POST", body: JSON.stringify({ sessionId, action: "SET_DURATION", duration: mins * 60 }) }).then(fetchTimer)}
            className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-bold uppercase tracking-wider"
          >
            {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} Mins`}
          </button>
        ))}
      </div>
    </div>
  );
}
