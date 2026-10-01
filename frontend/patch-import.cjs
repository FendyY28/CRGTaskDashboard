const fs = require("fs");
const p =
  "d:/Magang/CRGTaskDashboard-main/frontend/src/app/components/features/monitor/ProjectCard.tsx";
let s = fs.readFileSync(p, "utf8");
if (!s.includes("DoneTasksTable")) {
  s = s.replace(
    'import { StatusBadge } from "../../dashboard/index";',
    'import { StatusBadge } from "../../dashboard/index";\nimport { DoneTasksTable } from "./DoneTasksTable";',
  );
  fs.writeFileSync(p, s, "utf8");
  console.log("IMPORT ADDED");
} else {
  console.log("ALREADY OK");
}
