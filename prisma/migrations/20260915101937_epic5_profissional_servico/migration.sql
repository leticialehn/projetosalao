-- CreateTable
CREATE TABLE "_ProfissionalServicos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProfissionalServicos_A_fkey" FOREIGN KEY ("A") REFERENCES "Profissional" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProfissionalServicos_B_fkey" FOREIGN KEY ("B") REFERENCES "Servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProfissionalServicos_AB_unique" ON "_ProfissionalServicos"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfissionalServicos_B_index" ON "_ProfissionalServicos"("B");
