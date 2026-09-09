-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN "valorCobrado" REAL;

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agendamentoId" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "dataHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conferido" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pagamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComissaoRegra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profissionalId" TEXT NOT NULL,
    "percentual" REAL NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComissaoRegra_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FechamentoCaixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "totalDinheiro" REAL NOT NULL,
    "totalPix" REAL NOT NULL,
    "totalDebito" REAL NOT NULL,
    "totalCredito" REAL NOT NULL,
    "totalGeral" REAL NOT NULL,
    "qtdAtendimentos" INTEGER NOT NULL,
    "ticketMedio" REAL NOT NULL,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profissional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "especialidade" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "comissaoPercentual" REAL NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Profissional" ("ativo", "criadoEm", "especialidade", "id", "nome", "telefone") SELECT "ativo", "criadoEm", "especialidade", "id", "nome", "telefone" FROM "Profissional";
DROP TABLE "Profissional";
ALTER TABLE "new_Profissional" RENAME TO "Profissional";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Pagamento_dataHora_idx" ON "Pagamento"("dataHora");

-- CreateIndex
CREATE INDEX "Pagamento_agendamentoId_idx" ON "Pagamento"("agendamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "ComissaoRegra_profissionalId_key" ON "ComissaoRegra"("profissionalId");

-- CreateIndex
CREATE UNIQUE INDEX "FechamentoCaixa_data_key" ON "FechamentoCaixa"("data");
