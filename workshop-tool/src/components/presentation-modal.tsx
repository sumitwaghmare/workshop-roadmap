"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  User, 
  Building2, 
  Tag, 
  AlertCircle,
  Clock,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_COLORS, STATUS_COLORS, StatusType } from "@/lib/constants";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  priority?: string | null;
  bu?: string | null;
  owner?: string | null;
  timeline?: string | null;
  category?: string | null;
  horizon?: number | null;
  status?: string | null;
  spocCtg?: string | null;
  spocBu?: string | null;
}

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  initialIndex?: number;
}

export default function PresentationModal({
  isOpen,
  onClose,
  projects,
  initialIndex = 0
}: PresentationModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (currentIndex < projects.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, projects.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || projects.length === 0) return null;

  const currentProject = projects[currentIndex];
  const priorityColor = currentProject.priority && PRIORITY_COLORS[currentProject.priority] 
    ? PRIORITY_COLORS[currentProject.priority] 
    : null;
  
  const statusType = currentProject.status as StatusType;
  const statusColor = statusType && STATUS_COLORS[statusType] 
    ? STATUS_COLORS[statusType] 
    : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
        <div className="text-sm font-bold text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border">
          {currentIndex + 1} <span className="opacity-50">/</span> {projects.length}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="h-12 w-12 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors relative z-[60]"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute inset-y-0 left-4 flex items-center z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="h-20 w-12 rounded-2xl bg-muted/20 hover:bg-muted font-bold disabled:opacity-0 transition-all pointer-events-auto"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      </div>
      
      <div className="absolute inset-y-0 right-4 flex items-center z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === projects.length - 1}
          className="h-20 w-12 rounded-2xl bg-muted/20 hover:bg-muted font-bold disabled:opacity-0 transition-all pointer-events-auto"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="w-full max-w-6xl px-12 py-8 overflow-y-auto max-h-screen">
        <div 
          className="space-y-12 animate-in slide-in-from-bottom-8 duration-500 ease-out"
          key={currentProject.id}
        >
          {/* Header Section */}
          <div className="space-y-6 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-24 w-24 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-2xl shadow-blue-500/10">
                {currentProject.icon ? (
                  <i className={`${currentProject.icon} text-5xl text-blue-500`} />
                ) : (
                  <Target className="h-12 w-12 text-blue-500" />
                )}
              </div>
            </div>
            
            <h1 className="text-6xl font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent leading-tight px-4">
              {currentProject.name}
            </h1>

            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {currentProject.bu && (
                <Badge variant="outline" className="px-4 py-1.5 text-sm font-black uppercase tracking-widest bg-blue-500/5 text-blue-500 border-blue-500/20">
                  <Building2 size={14} className="mr-2" /> BU: {currentProject.bu}
                </Badge>
              )}
              {currentProject.category && (
                <Badge variant="outline" className="px-4 py-1.5 text-sm font-black uppercase tracking-widest bg-purple-500/5 text-purple-500 border-purple-500/20">
                  <Tag size={14} className="mr-2" /> {currentProject.category}
                </Badge>
              )}
              {priorityColor && (
                <Badge 
                  variant="outline" 
                  className="px-4 py-1.5 text-sm font-black uppercase tracking-widest"
                  style={{ backgroundColor: `${priorityColor.bg}`, color: priorityColor.border, borderColor: priorityColor.border }}
                >
                  <AlertCircle size={14} className="mr-2" /> {currentProject.priority?.replace(/-/g, " ")}
                </Badge>
              )}
            </div>
          </div>

          <hr className="border-border/50 max-w-2xl mx-auto" />

          {/* Body Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-xs">
                  <Info size={14} /> Description
                </div>
                <p className="text-2xl leading-relaxed text-foreground/90 font-medium bg-muted/20 p-8 rounded-3xl border border-border/50 shadow-inner max-h-[450px] overflow-y-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
                  {currentProject.description || "No description provided for this project."}
                </p>
              </div>

              {/* SPOC Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-border/50 bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                    <User size={12} /> SPOC CTG
                  </div>
                  <div className="text-xl font-bold">{currentProject.spocCtg || "Not Assigned"}</div>
                </div>
                <div className="p-6 rounded-2xl border border-border/50 bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                    <Building2 size={12} /> SPOC BU
                  </div>
                  <div className="text-xl font-bold">{currentProject.spocBu || "Not Assigned"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Status Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-xs">
                  <Target size={14} /> Consensus Placement
                </div>
                
                <div className="p-8 rounded-3xl border border-border/50 bg-card shadow-xl space-y-8">
                   <div className="space-y-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status / Quadrant</div>
                      {statusColor ? (
                        <div 
                          className="text-3xl font-black px-6 py-4 rounded-2xl border transition-all shadow-lg"
                          style={{ 
                            backgroundColor: statusColor.bg, 
                            color: statusColor.text, 
                            borderColor: statusColor.border,
                            boxShadow: `0 10px 30px -10px ${statusColor.border}40`
                          }}
                        >
                          {currentProject.status}
                        </div>
                      ) : (
                        <div className="text-3xl font-black text-muted-foreground/30 italic">Unplaced</div>
                      )}
                   </div>

                   <div className="space-y-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Horizon</div>
                      {currentProject.horizon !== null && currentProject.horizon !== undefined ? (
                        <div className="text-6xl font-black text-blue-500">
                          H{currentProject.horizon + 1}
                        </div>
                      ) : (
                        <div className="text-6xl font-black text-muted-foreground/30">?</div>
                      )}
                   </div>
                </div>
              </div>

              {/* Other Meta */}
              <div className="p-6 rounded-2xl border border-border/50 bg-muted/5 space-y-4">
                 {currentProject.timeline && (
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Clock size={12}/> Timeline</span>
                       <span className="text-sm font-bold">{currentProject.timeline}</span>
                    </div>
                 )}
                 {currentProject.owner && (
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><User size={12}/> Owner</span>
                       <span className="text-sm font-bold">{currentProject.owner}</span>
                    </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
