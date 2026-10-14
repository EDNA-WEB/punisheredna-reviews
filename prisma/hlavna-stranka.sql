-- Nová hlavná stránka: posun titulov v rebríčku Top 10 (šípky ▲▼).
-- Spusti raz v Neon → SQL Editor. Dá sa spustiť opakovane.
ALTER TABLE "Top10Entry" ADD COLUMN IF NOT EXISTS "prevRank" INTEGER;
