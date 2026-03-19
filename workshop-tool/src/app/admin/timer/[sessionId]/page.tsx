"use client";

import { use } from "react";
import CountdownTimer from "@/components/countdown-timer";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function FullscreenTimerPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  return (
    <div className="relative min-h-screen bg-background">
      <Link href="/admin" className="fixed top-6 left-6 z-[110]">
        <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-md border-border/50 hover:bg-background/80 transition-all font-bold">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
      </Link>
      
      <CountdownTimer sessionId={sessionId} variant="fullscreen" />
    </div>
  );
}
