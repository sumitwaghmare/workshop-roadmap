"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Lightbulb,
  Microscope,
  Cpu,
  Factory,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CTGQualificationWizardProps {
  onClose: () => void;
  projectName: string;
}

type Step = "GATE0_Q1" | "GATE0_Q2" | "GATE1_Q3" | "GATE2_Q4" | "RESULT";

interface WizardState {
  step: Step;
  answers: Record<string, boolean>;
  recommendation?: {
    type: "TRACK_A" | "TRACK_B" | "QA_MFG" | "ENG_SOURCING" | "STANDARD_NPD";
    title: string;
    description: string;
    action: string;
  };
}

export function CTGQualificationWizard({ onClose, projectName }: CTGQualificationWizardProps) {
  const [state, setState] = useState<WizardState>({
    step: "GATE0_Q1",
    answers: {},
  });

  const handleAnswer = (answer: boolean) => {
    const { step } = state;
    const newAnswers = { ...state.answers, [step]: answer };

    if (step === "GATE0_Q1") {
      if (answer) {
        setState({
          step: "RESULT",
          answers: newAnswers,
          recommendation: {
            type: "QA_MFG",
            title: "Route to BU Quality & Manufacturing",
            description: "Projects fixing field quality, manufacturing tolerances, or supply chain defects are essential but fall outside the Corporate Technology Group's innovation scope.",
            action: "Please coordinate with your Business Unit's Quality and Manufacturing teams for resolution.",
          },
        });
      } else {
        setState({ ...state, step: "GATE0_Q2", answers: newAnswers });
      }
    } else if (step === "GATE0_Q2") {
      if (answer) {
        setState({
          step: "RESULT",
          answers: newAnswers,
          recommendation: {
            type: "ENG_SOURCING",
            title: "Route to BU Engineering & Sourcing",
            description: "Purely cost-reduction (VAVE), sheet-metal redesigns, or component swaps are best handled by standard engineering and sourcing channels.",
            action: "CTG focuses on technology leaps. For this scope, please engage with BU Engineering and Sourcing.",
          },
        });
      } else {
        setState({ ...state, step: "GATE1_Q3", answers: newAnswers });
      }
    } else if (step === "GATE1_Q3") {
      if (answer) {
        setState({
          step: "RESULT",
          answers: newAnswers,
          recommendation: {
            type: "TRACK_B",
            title: "Qualifies for Track B: CoE",
            description: "This project requires advanced analytical data (Benchmarking, ANSYS, Modal Analysis) to solve problems on an existing platform.",
            action: "CTG CoE can provide the data/report. The BU remains responsible for executing CAD updates and ECOs.",
          },
        });
      } else {
        setState({ ...state, step: "GATE2_Q4", answers: newAnswers });
      }
    } else if (step === "GATE2_Q4") {
      if (answer) {
        setState({
          step: "RESULT",
          answers: newAnswers,
          recommendation: {
            type: "TRACK_A",
            title: "Qualifies for Track A: R&D Pipeline",
            description: "This project introduces net-new physics, advanced controls (AI/Sensor Fusion), or opens new strategic markets (TRL 2-6).",
            action: "This is a prime CTG target. We will protect this project with dedicated Skunkworks resources.",
          },
        });
      } else {
        setState({
          step: "RESULT",
          answers: newAnswers,
          recommendation: {
            type: "STANDARD_NPD",
            title: "Route to Standard BU NPD",
            description: "This project appears to be a standard incremental update. Corporate Technology Group (CTG) focuses on net-new technology leaps where it can add the most value.",
            action: "For standard updates and cycle-time reductions, please follow the standard Business Unit New Product Development (NPD) process.",
          },
        });
      }
    }
  };

  const reset = () => {
    setState({ step: "GATE0_Q1", answers: {} });
  };

  const renderQuestion = () => {
    const { step } = state;
    let icon = <Lightbulb className="w-10 h-10 text-blue-500" />;
    let question = "";
    let gateLabel = "";
    let gateDesc = "";

    switch (step) {
      case "GATE0_Q1":
        icon = <Factory className="w-10 h-10 text-amber-500" />;
        gateLabel = "Gate 0: Sustaining & Quality Filter";
        gateDesc = "Immediate routing for sustaining projects";
        question = "Does this project fix a field quality issue, a manufacturing tolerance, or a supply chain defect (e.g., Table Hardness, Boring Bar TIR)?";
        break;
      case "GATE0_Q2":
        icon = <Factory className="w-10 h-10 text-amber-500" />;
        gateLabel = "Gate 0: Sustaining & Quality Filter";
        gateDesc = "Immediate routing for sustaining projects";
        question = "Is this purely a cost-reduction exercise (VAVE), sheet-metal redesign, or swapping to an existing standard component (e.g., Pneumatic Chucks, Footprint reduction)?";
        break;
      case "GATE1_Q3":
        icon = <Microscope className="w-10 h-10 text-purple-500" />;
        gateLabel = "Gate 1: Center of Excellence (CoE) Filter";
        gateDesc = "Track B: Service Bureau";
        question = "Does this project require advanced analytical data (Benchmarking, ANSYS Topology Optimization, Experimental Modal Analysis) to solve a problem on an existing platform?";
        break;
      case "GATE2_Q4":
        icon = <Cpu className="w-10 h-10 text-emerald-500" />;
        gateLabel = "Gate 2: The Leap-Frog Filter";
        gateDesc = "Track A: R&D Pipeline";
        question = "Does this project introduce net-new physics, advanced control algorithms (AI/Sensor Fusion), or open entirely new strategic markets (e.g., Semiconductor, Hydrostatics) operating at TRL 2 to TRL 6?";
        break;
    }

    return (
      <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
          <div className="rounded-2xl bg-muted/50 p-3 shadow-inner">
            {icon}
          </div>
          <div>
            <Badge variant="outline" className="mb-1 text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
              {gateLabel}
            </Badge>
            <h3 className="text-sm font-medium text-muted-foreground">{gateDesc}</h3>
          </div>
        </div>

        <div className="min-h-[100px] flex items-center">
          <p className="text-xl font-semibold leading-relaxed text-foreground tracking-tight">
            &ldquo;{question}&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => handleAnswer(false)}
            className="h-16 text-lg font-bold border-2 hover:bg-muted/50 hover:border-primary/50 transition-all rounded-xl"
          >
            No
          </Button>
          <Button 
            size="lg" 
            onClick={() => handleAnswer(true)}
            className="h-16 text-lg font-bold shadow-lg shadow-primary/20 rounded-xl"
          >
            Yes
          </Button>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    const { recommendation } = state;
    if (!recommendation) return null;

    const isPositive = recommendation.type === "TRACK_A" || recommendation.type === "TRACK_B";

    return (
      <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-500">
        <div className={`rounded-2xl border p-6 text-center shadow-xl glass transition-all ${
          isPositive 
            ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10' 
            : 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10'
        }`}>
          <div className="mb-4 flex justify-center">
            {isPositive ? (
              <div className="rounded-full bg-emerald-500/20 p-4 text-emerald-500 animate-pulse-glow">
                <CheckCircle2 size={48} />
              </div>
            ) : (
              <div className="rounded-full bg-amber-500/20 p-4 text-amber-500">
                <AlertCircle size={48} />
              </div>
            )}
          </div>
          
          <h2 className={`text-2xl font-bold mb-2 ${isPositive ? 'text-emerald-500' : 'text-amber-500'}`}>
            {recommendation.title}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {recommendation.description}
          </p>
        </div>

        <div className="bg-muted/30 border border-border/50 rounded-xl p-5 space-y-3">
          <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
            <ArrowRight size={14} /> Recommended Action
          </h4>
          <p className="text-sm font-medium leading-relaxed">
            {recommendation.action}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={reset}>
            <RotateCcw size={16} className="mr-2" />
            Start Over
          </Button>
          <Button className="flex-1 rounded-xl h-12" onClick={onClose}>
            Finish
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Corporate Technology Group</span>
          <h2 className="text-lg font-bold truncate max-w-[305px]">{projectName}</h2>
        </div>
        {state.step !== "GATE0_Q1" && state.step !== "RESULT" && (
           <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-7 gap-1">
             <RotateCcw size={12} /> Reset
           </Button>
        )}
      </div>
      
      {state.step === "RESULT" ? renderResult() : renderQuestion()}

      <div className="flex items-center justify-center pt-2">
        <div className="flex gap-1.5">
          {["GATE0_Q1", "GATE0_Q2", "GATE1_Q3", "GATE2_Q4", "RESULT"].map((s, i) => {
            const steps = ["GATE0_Q1", "GATE0_Q2", "GATE1_Q3", "GATE2_Q4", "RESULT"];
            const currentIndex = steps.indexOf(state.step);
            const active = i === currentIndex;
            const completed = i < currentIndex;
            
            return (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  active ? 'w-8 bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]' : completed ? 'w-4 bg-primary/40' : 'w-1.5 bg-muted'
                }`} 
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
