-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "comissaoBase" TEXT NOT NULL DEFAULT 'BRUTO',
    "atualizadoEm" DATETIME NOT NULL
);
