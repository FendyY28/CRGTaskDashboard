import { memo, useMemo, useState } from "react";
import { User, CheckCircle2, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { PROJECT_STATUS, THEME } from "../../../constants/projectConstants";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";

interface TaskRecord {
  id?: number | string;
  taskId?: string | number | null;
  taskName?: string | null;
  status?: string | null;
  completedBy?: string | null;
  completedDate?: string | null;
}

interface WeeklyProgress {
  weekRange?: string | null;
  tasks?: TaskRecord[] | null;
}

interface Project {
  weeklyProgress?: WeeklyProgress[] | null;
}

interface DoneTask extends TaskRecord {
  weekRange?: string | null;
}

interface DoneTasksTableProps {
  project: Project;
}

const PREVIEW_COUNT = 5;

const isDone = (task: TaskRecord): boolean =>
  !!task && (task.status === "completed" || task.status === PROJECT_STATUS.COMPLETED);

const toTimestamp = (value?: string | null): number => {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const formatDateSafe = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

interface TaskSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
}

const TaskSearchBar = memo(({ query, onQueryChange }: TaskSearchBarProps) => {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
        style={{ color: THEME.BSI_LIGHT_GRAY }}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={t("timeline.projectCard.searchTasks", "Cari task…")}
        className="w-full rounded-lg border pl-8 pr-8 py-1.5 text-xs outline-none focus:ring-1"
        style={{
          borderColor: THEME.BSI_LIGHT_GRAY + "60",
          color: THEME.BSI_DARK_GRAY,
        }}
      />
      {query && (
        <button
          onClick={() => onQueryChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
        >
          <X className="h-3.5 w-3.5" style={{ color: THEME.BSI_LIGHT_GRAY }} />
        </button>
      )}
    </div>
  );
});
TaskSearchBar.displayName = "TaskSearchBar";

interface DoneTaskRowProps {
  task: DoneTask;
}

const DoneTaskRow = memo(({ task }: DoneTaskRowProps) => (
  <TableRow className="hover:bg-gray-50/50 transition-colors">
    <TableCell
      className="py-3 font-semibold text-xs whitespace-nowrap"
      style={{ color: THEME.BSI_DARK_GRAY }}
    >
      {task.weekRange}
    </TableCell>
    <TableCell className="py-3 text-xs">
      <p className="font-medium flex items-center gap-1.5" style={{ color: THEME.BSI_DARK_GRAY }}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: THEME.BSI_GREEN }} />
        {task.taskName || "Untitled Task"}
      </p>
      {task.taskId && (
        <p className="text-[10px] font-mono ml-5" style={{ color: THEME.BSI_LIGHT_GRAY }}>
          {task.taskId}
        </p>
      )}
    </TableCell>
    <TableCell
      className="py-3 text-center text-xs font-medium"
      style={{ color: THEME.BSI_DARK_GRAY }}
    >
      {task.completedBy ? (
        <span className="inline-flex items-center justify-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full">
          <User className="h-3 w-3" style={{ color: THEME.TOSCA }} />
          {task.completedBy}
        </span>
      ) : (
        <span className="italic" style={{ color: THEME.BSI_LIGHT_GRAY }}>
          —
        </span>
      )}
    </TableCell>
    <TableCell
      className="py-3 text-center text-xs whitespace-nowrap"
      style={{ color: THEME.BSI_GREY }}
    >
      {task.completedDate ? formatDateSafe(task.completedDate) : "-"}
    </TableCell>
  </TableRow>
));
DoneTaskRow.displayName = "DoneTaskRow";

/**
 * TASKS DONE - daftar ringkas task yang sudah selesai.
 * Menampilkan 5 terbaru, dengan pencarian inline dan tombol expand (bukan modal).
 */
export const DoneTasksTable = memo(({ project }: DoneTasksTableProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const doneTasks = useMemo(
    () =>
      (project.weeklyProgress ?? [])
        .flatMap((w: WeeklyProgress): DoneTask[] =>
          (w.tasks ?? []).map((task: TaskRecord): DoneTask => ({ ...task, weekRange: w.weekRange }))
        )
        .filter(isDone)
        .sort((a: DoneTask, b: DoneTask) => toTimestamp(b.completedDate) - toTimestamp(a.completedDate)),
    [project.weeklyProgress]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doneTasks;
    return doneTasks.filter((task: DoneTask) =>
      [task.taskName, task.taskId, task.weekRange, task.completedBy]
        .filter((v) => v !== null && v !== undefined && v !== "")
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [doneTasks, query]);

  if (doneTasks.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed py-6 text-center text-xs italic"
        style={{ borderColor: THEME.BSI_LIGHT_GRAY + "50", color: THEME.BSI_LIGHT_GRAY }}
      >
        {t("timeline.projectCard.noTasksDone", "Belum ada task yang selesai.")}
      </div>
    );
  }

  const visible = expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const hasMore = filtered.length > PREVIEW_COUNT;

  return (
    <div className="space-y-2">
      <TaskSearchBar query={query} onQueryChange={setQuery} />

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-sm bg-white"
        style={{ borderColor: THEME.BSI_LIGHT_GRAY + "40" }}
      >
        <Table>
          <TableHeader style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + "15" }}>
            <TableRow>
              <TableHead
                className="text-[10px] font-bold uppercase h-10"
                style={{ color: THEME.BSI_GREY }}
              >
                {t("timeline.projectCard.tableHeaders.period")}
              </TableHead>
              <TableHead
                className="text-[10px] font-bold uppercase h-10"
                style={{ color: THEME.BSI_GREY }}
              >
                {t("timeline.projectCard.tableHeaders.description", "Deskripsi")}
              </TableHead>
              <TableHead
                className="text-[10px] font-bold uppercase h-10 text-center"
                style={{ color: THEME.BSI_GREY }}
              >
                {t("timeline.projectCard.tableHeaders.doneBy", "Dikerjakan Oleh")}
              </TableHead>
              <TableHead
                className="text-[10px] font-bold uppercase h-10 text-center"
                style={{ color: THEME.BSI_GREY }}
              >
                {t("timeline.projectCard.tableHeaders.date", "Tanggal")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-xs py-8 italic"
                  style={{ color: THEME.BSI_LIGHT_GRAY }}
                >
                  {t("timeline.projectCard.noTasksDone", "Belum ada task yang sesuai.")}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((task: DoneTask, idx: number) => (
                <DoneTaskRow
                  key={`${task.weekRange ?? "na"}-${task.taskId ?? task.id ?? idx}`}
                  task={task}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Expand / Collapse toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors hover:bg-gray-50"
          style={{ color: THEME.TOSCA }}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {t("common.showLess", "Tampilkan lebih sedikit")}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {t("common.showMore", "Lihat semua")} ({filtered.length - PREVIEW_COUNT}{" "}
              {t("common.more", "lainnya")})
            </>
          )}
        </button>
      )}
    </div>
  );
});
DoneTasksTable.displayName = "DoneTasksTable";
