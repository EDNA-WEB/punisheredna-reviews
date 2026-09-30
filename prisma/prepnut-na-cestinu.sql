-- Jednorazovo: všetci doterajší používatelia prejdú na češtinu (KrálFilmu.cz).
-- Kto chce slovenčinu alebo angličtinu, prepne si ju v nastaveniach.
UPDATE "User" SET "language" = 'cs' WHERE "language" = 'sk';
