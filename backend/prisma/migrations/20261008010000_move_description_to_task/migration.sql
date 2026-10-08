/*
  Memindahkan deskripsi dari level WeeklyProgress (periode) ke level Task.

  - `description` dihapus dari `WeeklyProgress`. Kolom ini ditambahkan pada
    migration sebelumnya dan belum dipakai mengisi data, jadi aman di-drop.
  - `description` ditambahkan ke `Task` sebagai kolom wajib. Karena tabel `Task`
    sudah berisi baris, kolom dibuat dengan DEFAULT '' agar migration bisa jalan,
    lalu DEFAULT-nya dilepas supaya aplikasi wajib mengirim nilai eksplisit.

*/
-- AlterTable
ALTER TABLE "WeeklyProgress" DROP COLUMN IF EXISTS "description";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "description" DROP DEFAULT;
