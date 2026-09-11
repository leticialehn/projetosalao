-- CreateTable
CREATE TABLE "TaxaPagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formaPagamento" TEXT NOT NULL,
    "percentual" REAL NOT NULL DEFAULT 0,
    "valorFixo" REAL NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FechamentoCaixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "totalDinheiro" REAL NOT NULL,
    "totalPix" REAL NOT NULL,
    "totalDebito" REAL NOT NULL,
    "totalCredito" REAL NOT NULL,
    "totalGeral" REAL NOT NULL,
    "qtdAtendimentos" INTEGER NOT NULL,
    "ticketMedio" REAL NOT NULL,
    "totalTaxas" REAL NOT NULL DEFAULT 0,
    "totalLiquido" REAL NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_FechamentoCaixa" ("criadoEm", "data", "id", "observacoes", "qtdAtendimentos", "ticketMedio", "totalCredito", "totalDebito", "totalDinheiro", "totalGeral", "totalPix") SELECT "criadoEm", "data", "id", "observacoes", "qtdAtendimentos", "ticketMedio", "totalCredito", "totalDebito", "totalDinheiro", "totalGeral", "totalPix" FROM "FechamentoCaixa";
DROP TABLE "FechamentoCaixa";
ALTER TABLE "new_FechamentoCaixa" RENAME TO "FechamentoCaixa";
CREATE UNIQUE INDEX "FechamentoCaixa_data_key" ON "FechamentoCaixa"("data");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TaxaPagamento_formaPagamento_key" ON "TaxaPagamento"("formaPagamento");
