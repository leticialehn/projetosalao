-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ComissaoRegra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profissionalId" TEXT NOT NULL,
    "servicoId" TEXT,
    "percentual" REAL NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComissaoRegra_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComissaoRegra_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ComissaoRegra" ("criadoEm", "id", "percentual", "profissionalId") SELECT "criadoEm", "id", "percentual", "profissionalId" FROM "ComissaoRegra";
DROP TABLE "ComissaoRegra";
ALTER TABLE "new_ComissaoRegra" RENAME TO "ComissaoRegra";
CREATE UNIQUE INDEX "ComissaoRegra_profissionalId_servicoId_key" ON "ComissaoRegra"("profissionalId", "servicoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
