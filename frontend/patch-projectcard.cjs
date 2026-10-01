const fs = require("fs");
const p =
  "d:/Magang/CRGTaskDashboard-main/frontend/src/app/components/features/monitor/ProjectCard.tsx";
let s = fs.readFileSync(p, "utf8");
const q = '"';
const sq = "'";

const i1 =
  'import { User, Clock, LayoutDashboard, Map, CheckCircle2, ArrowRight, Search, X, Trash2 } from "lucide-react";';
const o1 =
  'import { User, LayoutDashboard, Map, CheckCircle2, ArrowRight, Search, X } from "lucide-react";';
if (s.includes(i1)) s = s.replace(i1, o1);

const i2 = 'import { WeeklyRow } from "./WeeklyRow";';
const o2 = 'import { DoneTasksTable } from "./DoneTasksTable";';
if (s.includes(i2)) s = s.replace(i2, o2);

const h = s.indexOf("weeklyLogs");
if (h >= 0) {
  const bs = s.lastIndexOf('<div className="space-y-4">', h);
  const end = s.indexOf("{/* ACTIVITY LOG", h);
  if (bs >= 0 && end >= 0) {
    const nb =
      [
        '<div className="space-y-4">',
        '          <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}><CheckCircle2 className="h-4 w-4" style={{ color: THEME.TOSCA }} /> {t(' +
          sq +
          "timeline.projectCard.tasksDone" +
          sq +
          ", " +
          sq +
          "Tasks Done" +
          sq +
          ")}</h4>",
        "          <DoneTasksTable project={project} onRequestDeleteTask={onDeleteTask} />",
        "        </div>",
        "",
      ].join("\n") + "\n        ";
    s = s.slice(0, bs) + nb + s.slice(end);
  } else {
    console.log("NOBOUNDS");
  }
}

fs.writeFileSync(p, s, "utf8");
console.log("PATCH DONE");
