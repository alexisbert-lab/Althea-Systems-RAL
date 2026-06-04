-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

-- Seed default tagline settings
INSERT INTO "site_settings" ("id", "key", "value", "label", "group", "updatedAt") VALUES
  (gen_random_uuid()::text, 'tagline_title',        'L''équipement médical professionnel à portée de tous',                                     'Titre de l''accroche',          'tagline',  NOW()),
  (gen_random_uuid()::text, 'tagline_description',  'Althea System vous propose une sélection rigoureuse de matériel médical certifié, livré rapidement partout en France.', 'Description de l''accroche',    'tagline',  NOW()),
  (gen_random_uuid()::text, 'tagline_stat_products','200+',      'Stat : Produits',         'tagline',  NOW()),
  (gen_random_uuid()::text, 'tagline_stat_categories','12',      'Stat : Catégories',       'tagline',  NOW()),
  (gen_random_uuid()::text, 'tagline_stat_shipping','dès 100€ HT','Stat : Livraison offerte','tagline', NOW()),
  (gen_random_uuid()::text, 'tagline_stat_support', '48h',       'Stat : Délai SAV',        'tagline',  NOW());
