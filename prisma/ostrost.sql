-- Ostré obrázky: uložené adresy malých náhľadov z TMDB sa zmenia na väčšie
-- (w500 pre plagáty a fotky osobností, w780 pre zábery z filmu).
-- Bezpečné spustiť opakovane; mení len adresy z image.tmdb.org.
UPDATE "Movie"      SET "poster"    = regexp_replace("poster",    '/t/p/w(45|92|154|185|200|300|342)/', '/t/p/w500/') WHERE "poster"    ~ '/t/p/w(45|92|154|185|200|300|342)/';
UPDATE "Person"     SET "photo"     = regexp_replace("photo",     '/t/p/w(45|92|154|185|200|300|342)/', '/t/p/w500/') WHERE "photo"     ~ '/t/p/w(45|92|154|185|200|300|342)/';
UPDATE "MoviePhoto" SET "thumbnail" = regexp_replace("thumbnail", '/t/p/w(92|154|185|200|300|342|500)/', '/t/p/w780/') WHERE "thumbnail" ~ '/t/p/w(92|154|185|200|300|342|500)/';
UPDATE "MovieVideo" SET "previewImage" = regexp_replace("previewImage", '/t/p/w(300|500|780)/', '/t/p/w1280/') WHERE "previewImage" ~ '/t/p/w(300|500|780)/';
-- Náhľady fotiek nahraných do Cloudinary: 2× šírka, moderný formát, vyššia kvalita.
UPDATE "MoviePhoto" SET "thumbnail" = replace("thumbnail", '/upload/w_300,c_limit,q_auto/', '/upload/f_auto,q_auto:good,w_600,c_limit/') WHERE "thumbnail" LIKE '%/upload/w_300,c_limit,q_auto/%';
