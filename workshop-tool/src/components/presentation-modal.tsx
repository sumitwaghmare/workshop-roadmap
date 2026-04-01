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
  Target,
  Printer
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

const ProjectSlide = ({ project, className }: { project: Project, className?: string }) => {
  const priorityColor = project.priority && PRIORITY_COLORS[project.priority] 
    ? PRIORITY_COLORS[project.priority] 
    : null;
  
  const statusType = project.status as StatusType;
  const statusColor = statusType && STATUS_COLORS[statusType] 
    ? STATUS_COLORS[statusType] 
    : null;

  return (
    <div className={`w-full max-w-6xl px-12 py-8 mx-auto ${className}`}>
      <div 
        className="space-y-12 animate-in slide-in-from-bottom-8 duration-500 ease-out print:animate-none print:slide-in-none"
        key={project.id}
      >
        {/* Header Section */}
        <div className="space-y-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-24 w-24 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-2xl shadow-blue-500/10 print:shadow-none">
              {project.icon ? (
                <i className={`${project.icon} text-5xl text-blue-500`} />
              ) : (
                <Target className="h-12 w-12 text-blue-500" />
              )}
            </div>
          </div>
          
          <h1 className="text-6xl font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent leading-tight px-4 print:text-black print:bg-none print:text-5xl">
            {project.name}
          </h1>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {project.bu && (
              <Badge variant="outline" className="px-4 py-1.5 text-sm font-black uppercase tracking-widest bg-blue-500/5 text-blue-500 border-blue-500/20 print:bg-transparent print:text-blue-600 print:border-blue-200">
                <Building2 size={14} className="mr-2" /> BU: {project.bu}
              </Badge>
            )}
            {project.category && (
              <Badge variant="outline" className="px-4 py-1.5 text-sm font-black uppercase tracking-widest bg-purple-500/5 text-purple-500 border-purple-500/20 print:bg-transparent print:text-purple-600 print:border-purple-200">
                <Tag size={14} className="mr-2" /> {project.category}
              </Badge>
            )}
            {priorityColor && (
              <Badge 
                variant="outline" 
                className="px-4 py-1.5 text-sm font-black uppercase tracking-widest"
                style={{ backgroundColor: `${priorityColor.bg}`, color: priorityColor.border, borderColor: priorityColor.border }}
              >
                <AlertCircle size={14} className="mr-2" /> {project.priority?.replace(/-/g, " ")}
              </Badge>
            )}
          </div>
        </div>

        <hr className="border-border/50 max-w-2xl mx-auto print:border-gray-200" />

        {/* Body Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start print:gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-xs print:text-gray-500">
                <Info size={14} /> Description
              </div>
              <p className="text-2xl leading-relaxed text-foreground/90 font-medium bg-muted/20 p-8 rounded-3xl border border-border/50 shadow-inner max-h-[450px] overflow-y-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent print:shadow-none print:bg-white print:border-gray-100 print:text-lg print:p-6">
                {project.description || "No description provided for this project."}
              </p>
            </div>

            {/* SPOC Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
              <div className="p-6 rounded-2xl border border-border/50 bg-muted/10 space-y-3 print:bg-white print:border-gray-100 print:p-4">
                <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-[10px] print:text-gray-500">
                  <User size={12} /> SPOC CTG
                </div>
                <div className="text-xl font-bold print:text-lg">{project.spocCtg || "Not Assigned"}</div>
              </div>
              <div className="p-6 rounded-2xl border border-border/50 bg-muted/10 space-y-3 print:bg-white print:border-gray-100 print:p-4">
                <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-[10px] print:text-gray-500">
                  <Building2 size={12} /> SPOC BU
                </div>
                <div className="text-xl font-bold print:text-lg">{project.spocBu || "Not Assigned"}</div>
              </div>
            </div>
          </div>

          <div className="space-y-8 print:space-y-6">
            {/* Status Section */}
            <div className="space-y-6 print:space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-xs print:text-gray-500">
                <Target size={14} /> Consensus Placement
              </div>
              
              <div className="p-8 rounded-3xl border border-border/50 bg-card shadow-xl space-y-8 print:shadow-none print:bg-white print:border-gray-100 print:p-6 print:space-y-6">
                 <div className="space-y-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground print:text-gray-500">Status / Quadrant</div>
                    {statusColor ? (
                      <div 
                        className="text-3xl font-black px-6 py-4 rounded-2xl border transition-all shadow-lg print:shadow-none print:text-2xl print:py-3 print:px-4"
                        style={{ 
                          backgroundColor: statusColor.bg, 
                          color: statusColor.text, 
                          borderColor: statusColor.border,
                        }}
                      >
                        {project.status}
                      </div>
                    ) : (
                      <div className="text-3xl font-black text-muted-foreground/30 italic print:text-gray-300">Unplaced</div>
                    )}
                 </div>

                 <div className="space-y-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground print:text-gray-500">Horizon</div>
                    {project.horizon !== null && project.horizon !== undefined ? (
                      <div className="text-6xl font-black text-blue-500 print:text-4xl">
                        H{project.horizon + 1}
                      </div>
                    ) : (
                      <div className="text-6xl font-black text-muted-foreground/30 print:text-4xl">?</div>
                    )}
                 </div>
              </div>
            </div>

            {/* Other Meta */}
            <div className="p-6 rounded-2xl border border-border/50 bg-muted/5 space-y-4 print:bg-white print:border-gray-100 print:p-4">
               {project.timeline && (
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 print:text-gray-500"><Clock size={12}/> Timeline</span>
                     <span className="text-sm font-bold print:text-xs">{project.timeline}</span>
                  </div>
               )}
               {project.owner && (
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 print:text-gray-500"><User size={12}/> Owner</span>
                     <span className="text-sm font-bold print:text-xs">{project.owner}</span>
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-xl animate-in fade-in duration-300 print:bg-white print:backdrop-blur-none print:p-0 print:m-0 print:absolute">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 0; }
          .no-print { display: none !important; }
          .print-only { 
            display: block !important; 
            position: absolute !important; 
            top: 0 !important; 
            left: 0 !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background: white !important;
          }
          .page-break { 
            page-break-after: always !important; 
            break-after: page !important;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          body {
            overflow: visible !important;
          }
          .fixed, [class*="fixed"] {
            position: absolute !important;
          }
        }
      ` }} />

      <div className="absolute top-6 right-6 flex items-center gap-4 z-50 no-print">
        <div className="text-sm font-bold text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border">
          {currentIndex + 1} <span className="opacity-50">/</span> {projects.length}
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={(e) => {
            e.stopPropagation();
            handlePrint();
          }}
          className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-600 transition-colors relative z-[60]"
          title="Export to PDF"
        >
          <Printer className="h-6 w-6" />
        </Button>
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
      <div className="absolute inset-y-0 left-4 flex items-center z-50 no-print">
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
      
      <div className="absolute inset-y-0 right-4 flex items-center z-50 no-print">
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

      {/* Content Area - On Screen View */}
      <div className="w-full max-w-6xl px-12 py-8 overflow-y-auto max-h-screen no-print">
         <ProjectSlide project={currentProject} />
      </div>

      {/* Print-Only Layout Rendering all projects */}
      <div className="hidden print-only">
        {projects.map((project) => (
          <div key={`print-${project.id}`} className="page-break">
            <ProjectSlide project={project} />
          </div>
        ))}
      </div>
    </div>
  );
}
