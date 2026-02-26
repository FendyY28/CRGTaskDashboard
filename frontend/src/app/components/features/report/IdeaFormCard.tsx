import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { DashboardTextarea, DashboardSelect, DashboardCard } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants";
import type { Project } from "../../../types";

const INITIAL_IMP = { projectId: "", description: "" };

interface IdeaFormCardProps {
  liveProjects: Project[];
  onSubmitImprovement: (data: any) => Promise<any>; // 🔥 Prop Baru
}

export function IdeaFormCard({ liveProjects, onSubmitImprovement }: IdeaFormCardProps) {
  const [impForm, setImpForm] = useState(INITIAL_IMP);
  const [isBusy, setIsBusy] = useState(false);

  const handleImprovementSubmit = async () => {
    setIsBusy(true);
    const userName = localStorage.getItem('user_name') || "System Admin";

    toast.promise(
      // Menggunakan fungsi yang dilempar Induk
      onSubmitImprovement({ 
        ...impForm, 
        noteId: `IMP-${Date.now().toString().slice(-4)}`,
        reviewer: userName, 
        developer: "Team", 
        recommendations: impForm.description, 
        priority: "medium",
        createdDate: new Date().toISOString()
      }),
      {
        loading: 'Submitting optimization plan...',
        success: () => {
          setImpForm(INITIAL_IMP);
          setIsBusy(false);
          return 'Idea submitted successfully!';
        },
        error: () => {
          setIsBusy(false);
          return 'Failed to submit idea.';
        }
      }
    );
  };

  return (
    <DashboardCard color={THEME.TOSCA} title="Idea" icon={Lightbulb} contentClassName="space-y-4 pt-5 pb-6">
      <DashboardSelect value={impForm.projectId} onChange={(e: any) => setImpForm(p => ({...p, projectId: e.target.value}))}>
        <option value="">Select Project...</option>
        {liveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </DashboardSelect>
      <DashboardTextarea value={impForm.description} onChange={(e: any) => setImpForm(p => ({...p, description: e.target.value}))} placeholder="Your idea..." />
      <Button onClick={handleImprovementSubmit} disabled={isBusy || !impForm.projectId || !impForm.description} className="w-full font-bold text-white rounded-xl border-none hover:opacity-90" style={{ backgroundColor: THEME.TOSCA }}>
        {isBusy ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit"}
      </Button>
    </DashboardCard>
  );
}