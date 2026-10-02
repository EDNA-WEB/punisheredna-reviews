-- Diagnostika: koľko obrázkov je uložených priamo v databáze (base64)
-- Neon → SQL Editor → vložiť celé → Run. Výsledok (tabuľku) pošli do chatu.

SELECT stlpec, vyplnene, ulozene_v_db,
       pg_size_pretty(bajty_v_db) AS velkost_v_db,
       pg_size_pretty(najvacsi) AS najvacsi_obrazok
FROM (
SELECT 'Movie.poster' AS stlpec,
       COUNT(*) FILTER (WHERE "poster" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "poster" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("poster")) FILTER (WHERE "poster" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("poster")), 0)::bigint AS najvacsi
FROM "Movie"
UNION ALL
SELECT 'Movie.onlineImage' AS stlpec,
       COUNT(*) FILTER (WHERE "onlineImage" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "onlineImage" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("onlineImage")) FILTER (WHERE "onlineImage" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("onlineImage")), 0)::bigint AS najvacsi
FROM "Movie"
UNION ALL
SELECT 'MoviePhoto.thumbnail' AS stlpec,
       COUNT(*) FILTER (WHERE "thumbnail" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "thumbnail" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("thumbnail")) FILTER (WHERE "thumbnail" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("thumbnail")), 0)::bigint AS najvacsi
FROM "MoviePhoto"
UNION ALL
SELECT 'MoviePhoto.full' AS stlpec,
       COUNT(*) FILTER (WHERE "full" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "full" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("full")) FILTER (WHERE "full" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("full")), 0)::bigint AS najvacsi
FROM "MoviePhoto"
UNION ALL
SELECT 'MovieVideo.previewImage' AS stlpec,
       COUNT(*) FILTER (WHERE "previewImage" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "previewImage" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("previewImage")) FILTER (WHERE "previewImage" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("previewImage")), 0)::bigint AS najvacsi
FROM "MovieVideo"
UNION ALL
SELECT 'NewsPost.coverImage' AS stlpec,
       COUNT(*) FILTER (WHERE "coverImage" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "coverImage" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("coverImage")) FILTER (WHERE "coverImage" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("coverImage")), 0)::bigint AS najvacsi
FROM "NewsPost"
UNION ALL
SELECT 'BlogPost.coverImage' AS stlpec,
       COUNT(*) FILTER (WHERE "coverImage" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "coverImage" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("coverImage")) FILTER (WHERE "coverImage" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("coverImage")), 0)::bigint AS najvacsi
FROM "BlogPost"
UNION ALL
SELECT 'ArticleRevision.coverImage' AS stlpec,
       COUNT(*) FILTER (WHERE "coverImage" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "coverImage" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("coverImage")) FILTER (WHERE "coverImage" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("coverImage")), 0)::bigint AS najvacsi
FROM "ArticleRevision"
UNION ALL
SELECT 'User.avatar' AS stlpec,
       COUNT(*) FILTER (WHERE "avatar" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "avatar" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("avatar")) FILTER (WHERE "avatar" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("avatar")), 0)::bigint AS najvacsi
FROM "User"
UNION ALL
SELECT 'Person.photo' AS stlpec,
       COUNT(*) FILTER (WHERE "photo" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "photo" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("photo")) FILTER (WHERE "photo" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("photo")), 0)::bigint AS najvacsi
FROM "Person"
UNION ALL
SELECT 'ShopProduct.image' AS stlpec,
       COUNT(*) FILTER (WHERE "image" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "image" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("image")) FILTER (WHERE "image" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("image")), 0)::bigint AS najvacsi
FROM "ShopProduct"
UNION ALL
SELECT 'Message.image' AS stlpec,
       COUNT(*) FILTER (WHERE "image" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "image" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("image")) FILTER (WHERE "image" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("image")), 0)::bigint AS najvacsi
FROM "Message"
UNION ALL
SELECT 'Settings.wallpaper' AS stlpec,
       COUNT(*) FILTER (WHERE "wallpaper" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "wallpaper" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("wallpaper")) FILTER (WHERE "wallpaper" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("wallpaper")), 0)::bigint AS najvacsi
FROM "Settings"
UNION ALL
SELECT 'Settings.mobileWallpaper' AS stlpec,
       COUNT(*) FILTER (WHERE "mobileWallpaper" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "mobileWallpaper" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("mobileWallpaper")) FILTER (WHERE "mobileWallpaper" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("mobileWallpaper")), 0)::bigint AS najvacsi
FROM "Settings"
UNION ALL
SELECT 'Settings.mobileLogo' AS stlpec,
       COUNT(*) FILTER (WHERE "mobileLogo" IS NOT NULL) AS vyplnene,
       COUNT(*) FILTER (WHERE "mobileLogo" LIKE 'data:%') AS ulozene_v_db,
       COALESCE(SUM(length("mobileLogo")) FILTER (WHERE "mobileLogo" LIKE 'data:%'), 0)::bigint AS bajty_v_db,
       COALESCE(MAX(length("mobileLogo")), 0)::bigint AS najvacsi
FROM "Settings"
) x
ORDER BY bajty_v_db DESC;
