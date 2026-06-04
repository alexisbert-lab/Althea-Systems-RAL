import { PrismaClient, Role, OrderStatus, ShippingRuleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('[Seed] Nettoyage de la base...');
  await prisma.shippingRule.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.address.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.carouselSlide.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('Password123!', 10);

  // ─── USERS ────────────────────────────────────────
  console.log('[Seed] Creation des utilisateurs...');
  const users = await Promise.all([
    prisma.user.create({
      data: { email: 'admin@althea-system.fr', name: 'Admin Althea', passwordHash: hash, role: Role.ADMIN, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'moderateur@althea-system.fr', name: 'Modérateur Althea', passwordHash: hash, role: Role.MODERATOR, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'client@althea-system.fr', name: 'Client Althea', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'dr.martin@cabinet-martin.fr', name: 'Dr. Sophie Martin', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'dr.dupont@medecine.fr', name: 'Dr. Pierre Dupont', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'dr.leroy@clinique-paris.fr', name: 'Dr. Isabelle Leroy', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'dr.bernard@radiologie.fr', name: 'Dr. Jean Bernard', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'dr.moreau@pediatrie.fr', name: 'Dr. Marie Moreau', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'cabinet.lyon@mail.fr', name: 'Cabinet Médical Lyon Centre', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'dr.petit@cardiologie.fr', name: 'Dr. Thomas Petit', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'clinique.bordeaux@mail.fr', name: 'Clinique Bordeaux Santé', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
    prisma.user.create({
      data: { email: 'dr.fournier@ophtalmo.fr', name: 'Dr. Élodie Fournier', passwordHash: hash, role: Role.USER, emailVerified: false },
    }),
    prisma.user.create({
      data: { email: 'secretariat@cabinet-neuro.fr', name: 'Cabinet Neurologie Toulouse', passwordHash: hash, role: Role.USER, emailVerified: true },
    }),
  ]);

  // ─── CATEGORIES ───────────────────────────────────
  console.log('[Seed] Creation des categories medicales...');
  const categoriesData = [
    { name: 'Diagnostic', description: 'Équipements de diagnostic médical : stéthoscopes, tensiomètres, otoscopes, oxymètres', image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&h=400&q=80', position: 1 },
    { name: 'Mobilier médical', description: 'Tables d\'examen, divans, tabourets, paravents et mobilier pour cabinets', image: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=600&h=400&q=80', position: 2 },
    { name: 'Instruments chirurgicaux', description: 'Instruments de chirurgie, sets de suture, pinces, ciseaux et bistouris', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&h=400&q=80', position: 3 },
    { name: 'Imagerie médicale', description: 'Échographes portables, dermatoscopes, caméras médicales', image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=600&h=400&q=80', position: 4 },
    { name: 'Consommables', description: 'Gants, compresses, seringues, aiguilles, pansements et consommables jetables', image: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&h=400&q=80', position: 5 },
    { name: 'Hygiène & Stérilisation', description: 'Autoclaves, désinfectants, bacs de stérilisation, conteneurs DASRI', image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&h=400&q=80', position: 6 },
    { name: 'Cardiologie', description: 'ECG, holters, défibrillateurs, moniteurs cardiaques', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&h=400&q=80', position: 7 },
    { name: 'Pneumologie', description: 'Spiromètres, nébuliseurs, extracteurs d\'oxygène, peak flow mètres', image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&h=400&q=80', position: 8 },
    { name: 'Ophtalmologie', description: 'Ophtalmoscopes, tonomètres, lampes à fente portables', image: 'https://images.unsplash.com/photo-1579165466949-3180a3d056d5?auto=format&fit=crop&w=600&h=400&q=80', position: 9 },
    { name: 'ORL', description: 'Otoscopes, audiomètres, miroirs de Clar, spéculums nasaux', image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=600&h=400&q=80', position: 10 },
    { name: 'Urgences', description: 'Défibrillateurs DAE, trousses d\'urgence, attelles, colliers cervicaux', image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&h=400&q=80', position: 11 },
    { name: 'Pédiatrie', description: 'Toise, pèse-bébé, otoscopes pédiatriques, matériel adapté enfant', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&h=400&q=80', position: 12 },
  ];

  const categories = await Promise.all(
    categoriesData.map((cat) =>
      prisma.category.create({
        data: { ...cat, slug: slugify(cat.name), active: true },
      }),
    ),
  );

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // ─── PRODUCTS ─────────────────────────────────────
  console.log('[Seed] Creation des produits medicaux...');

  interface ProductData {
    name: string;
    description: string;
    price: number;
    comparePrice?: number;
    stock: number;
    categoryId: string;
    featured: boolean;
    images: string[];
    specs: Record<string, string>;
    sku: string;
    position: number;
  }

  const productsData: ProductData[] = [
    // ── Diagnostic ──
    {
      name: 'Stéthoscope Littmann Classic III',
      description: 'Stéthoscope biauriculaire haute performance. Double pavillon à membrane flottante pour une auscultation adulte et pédiatrique. Son acoustique de qualité supérieure.',
      price: 12900, stock: 45, categoryId: catMap['Diagnostic'], featured: true,
      images: ['https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Littmann 3M', 'Pavillon': 'Double', 'Longueur tube': '69 cm', 'Poids': '150 g', 'Garantie': '5 ans' },
      sku: 'DIAG-STETH-001', position: 1,
    },
    {
      name: 'Tensiomètre automatique Omron M6',
      description: 'Tensiomètre automatique de bras avec brassard Intelli Wrap 22-42 cm. Détection de l\'arythmie, mémoire 2 × 100 mesures, affichage tricolore.',
      price: 8900, stock: 60, categoryId: catMap['Diagnostic'], featured: true,
      images: ['https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Omron', 'Type': 'Bras automatique', 'Brassard': '22-42 cm', 'Mémoire': '2×100', 'Alimentation': 'Piles AA / Secteur' },
      sku: 'DIAG-TENS-001', position: 2,
    },
    {
      name: 'Oxymètre de pouls Nonin Onyx Vantage',
      description: 'Oxymètre de pouls professionnel au doigt. Mesure SpO2 et fréquence cardiaque. LED haute luminosité, capteur PureSAT.',
      price: 19500, stock: 30, categoryId: catMap['Diagnostic'], featured: false,
      images: ['https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Nonin', 'Plage SpO2': '0-100%', 'Plage FC': '18-321 bpm', 'Autonomie': '6000 mesures spot', 'Poids': '52 g' },
      sku: 'DIAG-OXY-001', position: 3,
    },
    {
      name: 'Thermomètre tympanique Braun ThermoScan 7',
      description: 'Thermomètre auriculaire à infrarouge avec technologie Age Precision. Embouts pré-chauffés pour une mesure précise en 1 seconde.',
      price: 6500, stock: 80, categoryId: catMap['Diagnostic'], featured: false,
      images: ['https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Braun', 'Technologie': 'Infrarouge tympanique', 'Précision': '±0.2°C', 'Mémoire': '9 mesures', 'Embouts': 'Jetables' },
      sku: 'DIAG-THERM-001', position: 4,
    },
    {
      name: 'Otoscope Heine Beta 200',
      description: 'Otoscope à fibre optique halogène 3.5V. Éclairage sans ombre du conduit auditif. Lentille pivotante avec loupe 3×.',
      price: 32000, stock: 15, categoryId: catMap['Diagnostic'], featured: true,
      images: ['https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Heine', 'Éclairage': 'Halogène XHL', 'Grossissement': '3×', 'Spéculum': '2.5 / 4 mm', 'Alimentation': 'Manche rechargeable' },
      sku: 'DIAG-OTO-001', position: 5,
    },
    {
      name: 'Dermatoscope Heine Delta 30',
      description: 'Dermatoscope à LED haute puissance avec disque de contact. 6 filtres couleur interchangeables. Grossissement 10×.',
      price: 89000, stock: 8, categoryId: catMap['Diagnostic'], featured: false,
      images: ['https://images.unsplash.com/photo-1579165466949-3180a3d056d5?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Heine', 'Grossissement': '10×', 'LED': '6 LEDs haute puissance', 'Filtres': '6 couleurs', 'Compatible': 'iPhone / Galaxy' },
      sku: 'DIAG-DERM-001', position: 6,
    },

    // ── Mobilier médical ──
    {
      name: 'Table d\'examen hydraulique Promotal iQuest',
      description: 'Table d\'examen à hauteur variable hydraulique. Plan mousse haute densité 65 cm, têtière articulée, étriers intégrés. Revêtement skaï lavable.',
      price: 195000, stock: 5, categoryId: catMap['Mobilier médical'], featured: true,
      images: ['https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Promotal', 'Réglage hauteur': '52-92 cm', 'Dimensions': '195×65 cm', 'Charge max': '200 kg', 'Revêtement': 'Skaï lavable' },
      sku: 'MOB-TABLE-001', position: 1,
    },
    {
      name: 'Divan d\'examen pliant Carina 325',
      description: 'Divan d\'examen pliable, idéal pour consultations à domicile. Structure aluminium légère, mousse haute résilience, housse PVC.',
      price: 45000, stock: 12, categoryId: catMap['Mobilier médical'], featured: false,
      images: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Carina', 'Dimensions plié': '90×65×18 cm', 'Charge max': '180 kg', 'Poids': '14 kg', 'Hauteur': '65 cm fixe' },
      sku: 'MOB-DIVAN-001', position: 2,
    },
    {
      name: 'Tabouret médical à roulettes VELA Tango 100',
      description: 'Tabouret médical ergonomique à hauteur réglable par vérin à gaz. Assise pivotante 360°, roulettes avec frein. Revêtement skaï antibactérien.',
      price: 38000, stock: 20, categoryId: catMap['Mobilier médical'], featured: false,
      images: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'VELA', 'Hauteur': '46-59 cm', 'Diamètre assise': '34 cm', 'Charge max': '150 kg', 'Roulettes': 'Ø 50 mm avec frein' },
      sku: 'MOB-TAB-001', position: 3,
    },
    {
      name: 'Paravent médical 3 panneaux',
      description: 'Paravent à 3 panneaux en acier chromé avec toile ignifugée lavable. Roulettes avec frein pour déplacement facile.',
      price: 15900, stock: 18, categoryId: catMap['Mobilier médical'], featured: false,
      images: ['https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Panneaux': '3', 'Hauteur': '170 cm', 'Largeur totale': '180 cm', 'Matériaux': 'Acier chromé + toile M1', 'Roulettes': 'Avec frein' },
      sku: 'MOB-PARA-001', position: 4,
    },

    // ── Instruments chirurgicaux ──
    {
      name: 'Set de suture complet 12 pièces',
      description: 'Set de suture chirurgicale complet en acier inoxydable : porte-aiguille Mayo-Hegar, pinces Adson, ciseaux, pince Kocher, etc.',
      price: 8900, stock: 25, categoryId: catMap['Instruments chirurgicaux'], featured: false,
      images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Pièces': '12', 'Matériau': 'Acier inox AISI 420', 'Stérilisation': 'Autoclave 134°C', 'Étui': 'Rouleau en silicone', 'Garantie': '2 ans' },
      sku: 'CHIR-SUTURE-001', position: 1,
    },
    {
      name: 'Bistouri électrique monopolaire Erbe VIO 50C',
      description: 'Bistouri électrique compact monopolaire pour coupe et coagulation. Modes Auto Cut et Soft Coag. Idéal cabinet et petite chirurgie.',
      price: 350000, stock: 3, categoryId: catMap['Instruments chirurgicaux'], featured: true,
      images: ['https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Erbe', 'Modes': 'Cut / Coag', 'Puissance max': '50W', 'Poids': '3.1 kg', 'Classe': 'IIb' },
      sku: 'CHIR-BIST-001', position: 2,
    },
    {
      name: 'Pince hémostatique Halsted moustique 12 cm',
      description: 'Pince hémostatique Halsted-Mosquito courbe, 12 cm. Acier inoxydable chirurgical. Mors fins avec stries croisées.',
      price: 1500, stock: 100, categoryId: catMap['Instruments chirurgicaux'], featured: false,
      images: ['https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Longueur': '12 cm', 'Type': 'Courbe', 'Matériau': 'Acier inox', 'Stérilisation': 'Autoclave', 'Unité': '1 pièce' },
      sku: 'CHIR-PINCE-001', position: 3,
    },
    {
      name: 'Ciseaux chirurgicaux Mayo 17 cm',
      description: 'Ciseaux Mayo droits en acier inoxydable chirurgical. Lames émoussées/émoussées. Autoclavables à 134°C.',
      price: 1800, stock: 60, categoryId: catMap['Instruments chirurgicaux'], featured: false,
      images: ['https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Longueur': '17 cm', 'Type': 'Droits', 'Lames': 'Émoussées/Émoussées', 'Matériau': 'Acier inox', 'Stérilisation': 'Autoclave 134°C' },
      sku: 'CHIR-CIS-001', position: 4,
    },

    // ── Imagerie médicale ──
    {
      name: 'Échographe portable Butterfly iQ3',
      description: 'Échographe portatif à sonde unique connecté à smartphone/tablette. 23 presets cliniques, IA intégrée pour guidage en temps réel.',
      price: 350000, stock: 4, categoryId: catMap['Imagerie médicale'], featured: true,
      images: ['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Butterfly Network', 'Sonde': 'Semi-conducteur CMOS', 'Presets': '23', 'Connectivité': 'Wi-Fi / USB-C', 'Poids sonde': '312 g' },
      sku: 'IMG-ECHO-001', position: 1,
    },
    {
      name: 'Caméra intra-orale Dürr Dental VistaCam',
      description: 'Caméra intra-orale haute résolution pour examen dentaire. Capteur CMOS 2 mégapixels, LED blanche, connexion USB.',
      price: 125000, stock: 6, categoryId: catMap['Imagerie médicale'], featured: false,
      images: ['https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Dürr Dental', 'Résolution': '2 MP', 'LED': '6 LEDs blanches', 'Connexion': 'USB 2.0', 'Autoclavable': 'Gaine jetable' },
      sku: 'IMG-CAM-001', position: 2,
    },

    // ── Consommables ──
    {
      name: 'Gants nitrile non poudrés Hartmann (boîte de 100)',
      description: 'Gants d\'examen en nitrile bleu non poudrés. Ambidextre, manchette roulée, AQL 1.5. Boîte de 100 gants.',
      price: 990, stock: 500, categoryId: catMap['Consommables'], featured: false,
      images: ['https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Hartmann', 'Matériau': 'Nitrile', 'Tailles': 'XS / S / M / L / XL', 'AQL': '1.5', 'Conditionnement': 'Boîte 100' },
      sku: 'CONS-GANT-001', position: 1,
    },
    {
      name: 'Compresses stériles 10×10 cm (boîte de 50)',
      description: 'Compresses stériles en non-tissé 40g/m², 4 plis, emballage individuel par 2. Conformes à la norme EN 1644.',
      price: 650, stock: 300, categoryId: catMap['Consommables'], featured: false,
      images: ['https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Dimensions': '10×10 cm', 'Plis': '4', 'Gramme': '40 g/m²', 'Stérilité': 'Individuelle par 2', 'Norme': 'EN 1644' },
      sku: 'CONS-COMP-001', position: 2,
    },
    {
      name: 'Seringues jetables Luer 5 ml (boîte de 100)',
      description: 'Seringues jetables à embout Luer, 5 ml, graduation précise. Piston silicone souple, stériles. Boîte de 100.',
      price: 1200, stock: 400, categoryId: catMap['Consommables'], featured: false,
      images: ['https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Volume': '5 ml', 'Embout': 'Luer', 'Piston': 'Silicone', 'Stérilité': 'EO', 'Conditionnement': 'Boîte 100' },
      sku: 'CONS-SER-001', position: 3,
    },
    {
      name: 'Draps d\'examen 2 plis en rouleau (carton de 12)',
      description: 'Draps d\'examen jetables 2 plis en ouate gaufrée. Rouleau 50 m × 50 cm, prédécoupé tous les 38 cm. Carton de 12 rouleaux.',
      price: 3500, stock: 150, categoryId: catMap['Consommables'], featured: false,
      images: ['https://images.unsplash.com/photo-1631815587646-b85a1bb027e1?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Dimensions': '50 m × 50 cm', 'Plis': '2', 'Prédécoupe': 'Tous les 38 cm', 'Matière': 'Ouate gaufrée', 'Carton': '12 rouleaux' },
      sku: 'CONS-DRAP-001', position: 4,
    },
    {
      name: 'Aiguilles hypodermiques BD Microlance (boîte de 100)',
      description: 'Aiguilles hypodermiques stériles BD Microlance 3. Biseau tri-bevel ultra-affûté, code couleur. Boîte de 100.',
      price: 750, stock: 350, categoryId: catMap['Consommables'], featured: false,
      images: ['https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'BD', 'Gauges': '18G à 30G', 'Biseau': 'Tri-bevel', 'Stérilité': 'EtO', 'Conditionnement': 'Boîte 100' },
      sku: 'CONS-AIG-001', position: 5,
    },

    // ── Hygiène & Stérilisation ──
    {
      name: 'Autoclave Classe B Euronda E9 Next 18L',
      description: 'Autoclave de classe B 18 litres, 6 programmes de stérilisation. Traçabilité complète USB/carte SD. Conforme EN 13060.',
      price: 550000, stock: 2, categoryId: catMap['Hygiène & Stérilisation'], featured: true,
      images: ['https://images.unsplash.com/photo-1504813184591-01572f98c85f?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Euronda', 'Classe': 'B (EN 13060)', 'Volume': '18 L', 'Programmes': '6', 'Traçabilité': 'USB + carte SD' },
      sku: 'HYG-AUTO-001', position: 1,
    },
    {
      name: 'Désinfectant Anios Surfa\'Safe Premium 1L',
      description: 'Spray désinfectant de surfaces à spectre large. Bactéricide, fongicide, virucide (EN 14476). Prêt à l\'emploi, sans rinçage.',
      price: 890, stock: 200, categoryId: catMap['Hygiène & Stérilisation'], featured: false,
      images: ['https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Anios', 'Volume': '1 L', 'Spectre': 'Bactéricide / Fongicide / Virucide', 'Norme': 'EN 14476', 'Temps contact': '30 s' },
      sku: 'HYG-DESINF-001', position: 2,
    },
    {
      name: 'Conteneur DASRI 50L SharpSafe',
      description: 'Conteneur à déchets d\'activité de soins à risques infectieux (DASRI). Fermeture définitive sécurisée, jaune, conforme NFX 30-500.',
      price: 1500, stock: 80, categoryId: catMap['Hygiène & Stérilisation'], featured: false,
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Volume': '50 L', 'Couleur': 'Jaune', 'Norme': 'NFX 30-500', 'Fermeture': 'Définitive', 'Usage': 'DASRI piquants/tranchants' },
      sku: 'HYG-DASRI-001', position: 3,
    },
    {
      name: 'Savon antiseptique Bétadine Scrub 500ml',
      description: 'Solution moussante antiseptique à la povidone iodée 4%. Usage externe, lavage chirurgical et antiseptique des mains.',
      price: 750, stock: 120, categoryId: catMap['Hygiène & Stérilisation'], featured: false,
      images: ['https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Bétadine', 'Volume': '500 ml', 'Principe actif': 'Povidone iodée 4%', 'Usage': 'Lavage chirurgical', 'Spectre': 'Bactéricide / Fongicide' },
      sku: 'HYG-SAVON-001', position: 4,
    },

    // ── Cardiologie ──
    {
      name: 'Électrocardiographe 12 pistes Schiller CARDIOVIT AT-2plus',
      description: 'ECG 12 dérivations simultanées avec interprétation automatique. Écran tactile couleur 7", impression thermique, mémoire interne 200 ECG.',
      price: 495000, stock: 3, categoryId: catMap['Cardiologie'], featured: true,
      images: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Schiller', 'Dérivations': '12 simultanées', 'Écran': '7" tactile couleur', 'Mémoire': '200 ECG', 'Impression': 'Thermique A4' },
      sku: 'CARD-ECG-001', position: 1,
    },
    {
      name: 'Défibrillateur semi-auto HeartSine Samaritan PAD 500P',
      description: 'DSA avec assistance au massage cardiaque (RCP). Analyse ECG en 5 secondes, instructions vocales en français, IP56.',
      price: 175000, stock: 6, categoryId: catMap['Cardiologie'], featured: true,
      images: ['https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'HeartSine', 'Type': 'Semi-automatique', 'Énergie': '150-200 J biph.', 'IP': '56', 'Autonomie': '6 ans pile + électrodes' },
      sku: 'CARD-DSA-001', position: 2,
    },
    {
      name: 'Holter ECG Schiller Medilog FD12plus',
      description: 'Enregistreur Holter ECG 12 pistes jusqu\'à 7 jours. Léger (85g), résistant à l\'eau, logiciel d\'analyse inclus.',
      price: 680000, stock: 2, categoryId: catMap['Cardiologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Schiller', 'Pistes': '12', 'Durée': 'Jusqu\'à 7 jours', 'Poids': '85 g', 'Logiciel': 'Darwin2 inclus' },
      sku: 'CARD-HOLT-001', position: 3,
    },

    // ── Pneumologie ──
    {
      name: 'Spiromètre MIR Spirobank II Smart',
      description: 'Spiromètre portable PC connecté Bluetooth. Mesure FVC, FEV1, PEF. Turbine jetable, conforme ATS/ERS 2019.',
      price: 125000, stock: 8, categoryId: catMap['Pneumologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'MIR', 'Paramètres': 'FVC / FEV1 / PEF / FEF', 'Connectivité': 'Bluetooth + USB', 'Turbine': 'Jetable', 'Norme': 'ATS/ERS 2019' },
      sku: 'PNEU-SPIRO-001', position: 1,
    },
    {
      name: 'Nébuliseur à piston Omron CompAir C28P',
      description: 'Nébuliseur professionnel à compresseur. Kit adulte et pédiatrique inclus. Débit nébulisation 0.5 ml/min, MMAD 3 µm.',
      price: 8900, stock: 25, categoryId: catMap['Pneumologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Omron', 'Type': 'Piston', 'MMAD': '3 µm', 'Débit': '0.5 ml/min', 'Kits': 'Adulte + Pédiatrique' },
      sku: 'PNEU-NEB-001', position: 2,
    },

    // ── Ophtalmologie ──
    {
      name: 'Ophtalmoscope Heine Beta 200S',
      description: 'Ophtalmoscope direct à éclairage halogène. 6 ouvertures, 29 lentilles (-35D à +40D), filtre sans reflet.',
      price: 45000, stock: 10, categoryId: catMap['Ophtalmologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Heine', 'Lentilles': '29 (-35D à +40D)', 'Ouvertures': '6', 'Éclairage': 'Halogène XHL 3.5V', 'Filtre': 'Sans reflet cornéen' },
      sku: 'OPHT-OPH-001', position: 1,
    },

    // ── ORL ──
    {
      name: 'Set diagnostic ORL Heine mini 3000',
      description: 'Set combiné otoscope + ophtalmoscope mini format. Éclairage LED, manche à piles, étui de rangement inclus.',
      price: 28000, stock: 12, categoryId: catMap['ORL'], featured: false,
      images: ['https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Heine', 'Composants': 'Otoscope + Ophtalmoscope', 'Éclairage': 'LED', 'Manche': 'Piles AA', 'Étui': 'Inclus' },
      sku: 'ORL-SET-001', position: 1,
    },

    // ── Urgences ──
    {
      name: 'Défibrillateur automatique Zoll AED 3',
      description: 'Défibrillateur entièrement automatique avec écran tactile couleur. Assistance RCP en temps réel (Real CPR Help). Classe IP55.',
      price: 195000, stock: 5, categoryId: catMap['Urgences'], featured: true,
      images: ['https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Zoll', 'Type': 'Automatique', 'Écran': 'Tactile couleur', 'IP': '55', 'Assistance RCP': 'Real CPR Help' },
      sku: 'URG-DAE-001', position: 1,
    },
    {
      name: 'Trousse d\'urgence Médecin Holtex',
      description: 'Mallette d\'urgence complète pour médecins généralistes. Contenu conforme recommandations HAS. Sac souple rouge étanche.',
      price: 45000, stock: 10, categoryId: catMap['Urgences'], featured: false,
      images: ['https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Holtex', 'Contenu': '45+ réf.', 'Dimensions': '55×35×25 cm', 'Poids garni': '7 kg', 'Matière': 'Nylon 600D étanche' },
      sku: 'URG-TROUSSE-001', position: 2,
    },
    {
      name: 'Attelle d\'immobilisation SAM Splint',
      description: 'Attelle malléable en mousse aluminium. Se découpe aux ciseaux, radio-transparente, réutilisable. Longueur 91 cm.',
      price: 1500, stock: 50, categoryId: catMap['Urgences'], featured: false,
      images: ['https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'SAM Medical', 'Longueur': '91 cm', 'Largeur': '11 cm', 'Matériau': 'Aluminium + mousse', 'Réutilisable': 'Oui' },
      sku: 'URG-ATT-001', position: 3,
    },

    // ── Pédiatrie ──
    {
      name: 'Pèse-bébé électronique Seca 354',
      description: 'Balance pèse-bébé électronique avec fonction tare et pesée de maintien (HOLD). Plateau amovible, résolution 10g. Jusqu\'à 20 kg.',
      price: 32000, stock: 10, categoryId: catMap['Pédiatrie'], featured: false,
      images: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Seca', 'Portée': '20 kg', 'Résolution': '10 g', 'Fonction': 'Tare + HOLD', 'Alimentation': 'Piles AA' },
      sku: 'PED-PESE-001', position: 1,
    },
    {
      name: 'Toise murale Seca 206',
      description: 'Toise mécanique murale à ruban métallique. Mesure de 0 à 220 cm, graduation mm. Appui-tête coulissant.',
      price: 4500, stock: 30, categoryId: catMap['Pédiatrie'], featured: false,
      images: ['https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Seca', 'Plage': '0-220 cm', 'Graduation': '1 mm', 'Montage': 'Mural', 'Matériau': 'Ruban métal + plastique' },
      sku: 'PED-TOISE-001', position: 2,
    },

    // ── Diagnostic (suite) ──
    {
      name: 'Glucomètre Accu-Chek Performa',
      description: 'Lecteur de glycémie avec résultat en 5 secondes. Mémoire 500 résultats avec date/heure, alarme hyperglycémie. Livré avec 10 bandelettes et lancettes.',
      price: 3500, comparePrice: 4990, stock: 90, categoryId: catMap['Diagnostic'], featured: false,
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Roche', 'Résultat': '5 secondes', 'Mémoire': '500 résultats', 'Plage': '0.6–33.3 mmol/L', 'Alimentation': '2 piles AAA' },
      sku: 'DIAG-GLUCO-001', position: 7,
    },
    {
      name: 'Tensiomètre anéroïde Riester Exacta',
      description: 'Tensiomètre à brassard anéroïde de précision pour cabinet. Cadran 300 mmHg, aiguille de retour à zéro, brassard Velcro 22–32 cm inclus.',
      price: 5900, stock: 40, categoryId: catMap['Diagnostic'], featured: false,
      images: ['https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Riester', 'Type': 'Anéroïde', 'Plage': '0–300 mmHg', 'Brassard': '22–32 cm', 'Précision': '±3 mmHg' },
      sku: 'DIAG-TENS-002', position: 8,
    },
    {
      name: 'Stéthoscope Littmann Cardiology IV',
      description: 'Stéthoscope de cardiologie haute sensibilité. Pavillon nextGen double face, tube mono, embout oreilles Snap-tight. Idéal pour les souffles cardiaques.',
      price: 26900, comparePrice: 29900, stock: 18, categoryId: catMap['Diagnostic'], featured: true,
      images: ['https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Littmann 3M', 'Pavillon': 'Double face nextGen', 'Tube': 'Single lumen', 'Longueur': '69 cm', 'Garantie': '7 ans' },
      sku: 'DIAG-STETH-002', position: 9,
    },
    {
      name: 'Réfractomètre urinaire HI 96801',
      description: 'Réfractomètre optique pour mesure de densité urinaire et protéines. Lecture directe sur deux échelles, compensation température automatique.',
      price: 4200, stock: 0, categoryId: catMap['Diagnostic'], featured: false,
      images: ['https://images.unsplash.com/photo-1579165466949-3180a3d056d5?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'HANNA', 'Plage densité': '1.000–1.050', 'Plage protéines': '0–12 g/dL', 'Compensation': 'ATC 10–30°C', 'Poids': '75 g' },
      sku: 'DIAG-REFRAC-001', position: 10,
    },

    // ── Mobilier médical (suite) ──
    {
      name: 'Chariot de soins inox 3 plateaux Blanco',
      description: 'Chariot de soins en acier inoxydable 3 plateaux amovibles. Structure soudée, roulettes Ø 100 mm avec frein sur 2 roulettes. Bac supérieur avec rebord.',
      price: 58000, stock: 7, categoryId: catMap['Mobilier médical'], featured: false,
      images: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Blanco', 'Plateaux': '3', 'Matériau': 'Inox AISI 304', 'Dimensions': '85×55×90 cm', 'Charge totale': '80 kg' },
      sku: 'MOB-CHARIOT-001', position: 5,
    },
    {
      name: 'Table électrique motorisée 3 plans Promotal',
      description: 'Table d\'examen électrique 3 plans (dos, assise, pieds). Télécommande main et pied, revêtement skaï antibactérien, bandeau inox.',
      price: 420000, stock: 2, categoryId: catMap['Mobilier médical'], featured: true,
      images: ['https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Promotal', 'Motorisation': '3 plans', 'Hauteur': '46–92 cm', 'Charge max': '250 kg', 'Télécommande': 'Main + pied' },
      sku: 'MOB-TABLE-002', position: 6,
    },
    {
      name: 'Chaise de prélèvement articulée Greiner',
      description: 'Fauteuil de prélèvement avec bras articulé réglable et accoudoir rembourré. Hauteur fixe 53 cm, structure époxy blanc.',
      price: 28500, stock: 9, categoryId: catMap['Mobilier médical'], featured: false,
      images: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Greiner', 'Hauteur assise': '53 cm fixe', 'Bras': 'Articulé gauche/droit', 'Charge max': '200 kg', 'Revêtement': 'Skaï lavable' },
      sku: 'MOB-CHAISE-001', position: 7,
    },
    {
      name: 'Armoire de soins fermée à clé 2 portes',
      description: 'Armoire de stockage médicaments et matériel. 2 portes pleines avec serrure à clé, 4 étagères réglables, structure époxy blanc, socle.',
      price: 48000, stock: 5, categoryId: catMap['Mobilier médical'], featured: false,
      images: ['https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Dimensions': '90×40×180 cm', 'Étagères': '4 réglables', 'Fermeture': 'Serrure à clé', 'Matériau': 'Acier époxy blanc', 'Charge/étagère': '30 kg' },
      sku: 'MOB-ARM-001', position: 8,
    },

    // ── Instruments chirurgicaux (suite) ──
    {
      name: 'Porte-aiguille Mathieu 14 cm',
      description: 'Porte-aiguille Mathieu à crémaillère, 14 cm. Mors en carbure de tungstène pour une prise aiguille optimale. Acier inox chirurgical.',
      price: 2200, stock: 50, categoryId: catMap['Instruments chirurgicaux'], featured: false,
      images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Longueur': '14 cm', 'Mors': 'Carbure de tungstène', 'Verrouillage': 'Crémaillère', 'Matériau': 'Acier inox', 'Stérilisation': 'Autoclave 134°C' },
      sku: 'CHIR-PORT-001', position: 5,
    },
    {
      name: 'Pince à dissequer Adson sans griffes 12 cm',
      description: 'Pince à dissequer Adson lisse (sans griffes), 12 cm. Surface de préhension striée transversalement. Acier inox AISI 420.',
      price: 1200, stock: 80, categoryId: catMap['Instruments chirurgicaux'], featured: false,
      images: ['https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Longueur': '12 cm', 'Griffes': 'Sans', 'Surface': 'Striée transversale', 'Matériau': 'Acier inox AISI 420', 'Stérilisation': 'Autoclave' },
      sku: 'CHIR-ADSON-001', position: 6,
    },
    {
      name: 'Set de biopsie à l\'emporte-pièce 3-6 mm (5 pcs)',
      description: 'Set de 5 emporte-pièces de biopsie cutanée (3, 4, 4.5, 5 et 6 mm). Acier inox trempé, usage unique stérile.',
      price: 3500, stock: 60, categoryId: catMap['Instruments chirurgicaux'], featured: false,
      images: ['https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Diamètres': '3 / 4 / 4.5 / 5 / 6 mm', 'Usage': 'Unique stérile', 'Matériau': 'Acier inox trempé', 'Conditionnement': 'Set de 5', 'Stérilité': 'EtO' },
      sku: 'CHIR-BIO-001', position: 7,
    },
    {
      name: 'Écarteur de Farabeuf acier inox (paire)',
      description: 'Paire d\'écarteurs de Farabeuf doubles crochets, 16 cm. Acier inox poli brillant, autoclavable. Idéal pour petite chirurgie.',
      price: 2800, stock: 35, categoryId: catMap['Instruments chirurgicaux'], featured: false,
      images: ['https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Longueur': '16 cm', 'Crochets': 'Doubles', 'Finition': 'Poli brillant', 'Matériau': 'Acier inox', 'Conditionnement': 'Paire' },
      sku: 'CHIR-ECAR-001', position: 8,
    },

    // ── Imagerie médicale (suite) ──
    {
      name: 'Lampe d\'examen LED sur pied Luxamed',
      description: 'Lampe d\'examen LED 60 000 lux sur pied roulant. Tête orientable 360°, gradateur d\'intensité, bras articulé 4 pivots, roulettes avec frein.',
      price: 52000, stock: 8, categoryId: catMap['Imagerie médicale'], featured: false,
      images: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Luxamed', 'Luminosité': '60 000 lux', 'Température couleur': '4000 K', 'Bras': '4 pivots', 'Alimentation': 'Secteur + USB backup' },
      sku: 'IMG-LAMP-001', position: 3,
    },
    {
      name: 'Échographe trolley Samsung Medison',
      description: 'Échographe sur chariot avec 3 connexions sondes simultanées. Résolution 4D, doppler couleur, enregistrement USB. Écran 21.5" inclinable.',
      price: 2800000, stock: 1, categoryId: catMap['Imagerie médicale'], featured: true,
      images: ['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Samsung Medison', 'Écran': '21.5" inclinable', 'Modes': '2D / 3D / 4D / Doppler', 'Sondes': '3 connexions sim.', 'Export': 'USB / DICOM' },
      sku: 'IMG-ECHO-002', position: 4,
    },
    {
      name: 'Colposcope portable Leisegang',
      description: 'Colposcope numérique portable avec capture vidéo HD. Grossissement 4–25×, éclairage LED xenon, filtre vert, connexion HDMI.',
      price: 890000, stock: 2, categoryId: catMap['Imagerie médicale'], featured: false,
      images: ['https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Leisegang', 'Grossissement': '4–25×', 'Éclairage': 'LED xenon', 'Filtre': 'Vert', 'Sortie': 'HDMI + USB' },
      sku: 'IMG-COLPO-001', position: 5,
    },
    {
      name: 'Caméra vidéo médicale USB 4K',
      description: 'Caméra médicale documentaire USB 4K pour plateau photo produits, dermatologie et documentation clinique. Fixation standard 1/4".',
      price: 98000, stock: 5, categoryId: catMap['Imagerie médicale'], featured: false,
      images: ['https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Résolution': '4K (3840×2160)', 'Connexion': 'USB 3.0', 'Capteur': '1/2.5" CMOS', 'Fixation': '1/4" standard', 'Logiciel': 'Compatible ImageJ / PathLab' },
      sku: 'IMG-CAMVID-001', position: 6,
    },

    // ── Consommables (suite) ──
    {
      name: 'Pansements hydrocolloïdes Comfeel Plus (boîte 10)',
      description: 'Pansements hydrocolloïdes transparents Coloplast. Absorbent l\'exsudat, maintien 7 jours en moyenne, imperméables aux bactéries.',
      price: 1850, stock: 200, categoryId: catMap['Consommables'], featured: false,
      images: ['https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Coloplast', 'Type': 'Hydrocolloïde', 'Taille': '10×10 cm', 'Conditionnement': 'Boîte 10', 'Durée port': 'Jusqu\'à 7 jours' },
      sku: 'CONS-PANS-001', position: 6,
    },
    {
      name: 'Perfuseurs Luer-Lock avec filtre (boîte 50)',
      description: 'Perfuseurs stériles à chambre compte-gouttes, filtre 15 µm intégré, embout Luer-Lock. Débit régulé, longueur 150 cm. Boîte de 50.',
      price: 4200, stock: 180, categoryId: catMap['Consommables'], featured: false,
      images: ['https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Longueur': '150 cm', 'Filtre': '15 µm', 'Embout': 'Luer-Lock', 'Stérilité': 'EtO', 'Conditionnement': 'Boîte 50' },
      sku: 'CONS-PERF-001', position: 7,
    },
    {
      name: 'Bandelettes réactives urinaires Combur 10 (boîte 100)',
      description: 'Bandelettes de test urinaire 10 paramètres (leucocytes, nitrites, protéines, glucose, cétones, sang, pH, urobilinogène, bilirubine, densité).',
      price: 2800, stock: 250, categoryId: catMap['Consommables'], featured: false,
      images: ['https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Roche', 'Paramètres': '10', 'Lecture': 'Visuelle / automate', 'Conservation': '18 mois', 'Conditionnement': 'Flacon 100 bandelettes' },
      sku: 'CONS-BANDE-001', position: 8,
    },

    // ── Hygiène & Stérilisation (suite) ──
    {
      name: 'Solution hydroalcoolique SHA Anios 5L',
      description: 'Solution hydroalcoolique pour friction hygiénique des mains. Formule OMS, bactéricide / virucide EN 14476, sans rinçage. Bidon 5 L.',
      price: 3200, stock: 300, categoryId: catMap['Hygiène & Stérilisation'], featured: false,
      images: ['https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Anios', 'Volume': '5 L', 'Spectre': 'Bactéricide / Virucide', 'Norme': 'EN 14476 + OMS', 'Temps contact': '30 s' },
      sku: 'HYG-SHA-001', position: 5,
    },
    {
      name: 'Gaines de stérilisation Stericlin 90 mm × 200 m',
      description: 'Gaines de conditionnement pour stérilisation vapeur. Largeur 90 mm, rouleau 200 m. Indicateur chimique interne classe 1. Compatible autoclave classe B.',
      price: 2900, stock: 120, categoryId: catMap['Hygiène & Stérilisation'], featured: false,
      images: ['https://images.unsplash.com/photo-1504813184591-01572f98c85f?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Stericlin', 'Largeur': '90 mm', 'Longueur rouleau': '200 m', 'Indicateur': 'Classe 1', 'Compatible': 'Autoclave classe B/S' },
      sku: 'HYG-GAINE-001', position: 6,
    },
    {
      name: 'Détergent enzymatique Aniosyme DDL 5L',
      description: 'Détergent enzymatique multi-enzymatique pour pré-désinfection de dispositifs médicaux. Actif contre prions. Bidon 5 L.',
      price: 4500, stock: 80, categoryId: catMap['Hygiène & Stérilisation'], featured: false,
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Anios', 'Volume': '5 L', 'Enzymes': 'Multi-enzymatique', 'Action prions': 'Oui', 'Dilution': '0.5–1%' },
      sku: 'HYG-DETERG-001', position: 7,
    },

    // ── Cardiologie (suite) ──
    {
      name: 'Moniteur de patient portable Mindray VS-900',
      description: 'Moniteur multiparamètres compact : SpO2, NIBP, ECG 3/5 dérivations, FC, FR, température. Écran tactile 10.1" couleur. Autonomie 6h.',
      price: 385000, stock: 3, categoryId: catMap['Cardiologie'], featured: true,
      images: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Mindray', 'Écran': '10.1" tactile', 'Paramètres': 'SpO2 / NIBP / ECG / T°', 'Autonomie': '6h Li-ion', 'IP': '54' },
      sku: 'CARD-MON-001', position: 4,
    },
    {
      name: 'Holter tensionnel ambulatoire Welch Allyn ABPM 6100',
      description: 'Enregistreur de pression ambulatoire sur 24/48h. Mesure toutes les 15–30 min, mémoire 250 mesures, logiciel d\'analyse inclus.',
      price: 320000, stock: 4, categoryId: catMap['Cardiologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Welch Allyn', 'Durée': '24/48h', 'Intervalle': '15 ou 30 min', 'Mémoire': '250 mesures', 'Logiciel': 'Analysis inclus' },
      sku: 'CARD-HOLTT-001', position: 5,
    },
    {
      name: 'Électrodes ECG jetables Red Dot 3M (pack 100)',
      description: 'Électrodes de surveillance ECG adulte à gel solide, adhésif hypoallergénique. Contact argenté. Pack de 100 électrodes.',
      price: 1800, stock: 500, categoryId: catMap['Cardiologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': '3M', 'Type': 'Gel solide', 'Contact': 'Ag/AgCl', 'Taille': 'Adulte', 'Conditionnement': 'Pack 100' },
      sku: 'CARD-ELEC-001', position: 6,
    },
    {
      name: 'Défibrillateur DAE Philips HeartStart FRx',
      description: 'DAE robuste IP55 avec instructions vocales claires. Analyse ECG automatique, choc biph. 150J. Électrodes enfant/adulte combinées SMART Pads II.',
      price: 220000, stock: 4, categoryId: catMap['Cardiologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Philips', 'Énergie': '150 J biphasique', 'IP': '55', 'Électrodes': 'SMART Pads II adulte/enfant', 'Autonomie': '4 ans' },
      sku: 'CARD-DAE-002', position: 7,
    },

    // ── Pneumologie (suite) ──
    {
      name: 'Peak flow mètre Mini-Wright Standard',
      description: 'Débitmètre de pointe portatif pour mesure DEP. Plage 60–800 L/min, précision ±10%. Avec zone indicator rouge/jaune/vert.',
      price: 2200, stock: 60, categoryId: catMap['Pneumologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Clement Clarke', 'Plage': '60–800 L/min', 'Précision': '±10%', 'Zones': 'Rouge/Jaune/Vert', 'Embout': 'Jetable inclus' },
      sku: 'PNEU-PEAK-001', position: 3,
    },
    {
      name: 'Extracteur d\'oxygène 5 L/min DeVilbiss',
      description: 'Concentrateur d\'oxygène pour usage domestique et clinique. Débit 0.5–5 L/min, pureté 93%±3%, bruit 42 dB, câble 2 m.',
      price: 89000, comparePrice: 99000, stock: 5, categoryId: catMap['Pneumologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'DeVilbiss', 'Débit max': '5 L/min', 'Pureté': '93% ±3%', 'Bruit': '42 dB', 'Poids': '13.6 kg' },
      sku: 'PNEU-EXT-001', position: 4,
    },
    {
      name: 'Masques haute concentration adulte (boîte 10)',
      description: 'Masques à haute concentration avec réservoir 1 L pour FiO2 jusqu\'à 90%. Tuyau 2.1 m, collier réglable, latex free. Boîte de 10.',
      price: 2800, stock: 150, categoryId: catMap['Pneumologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'FiO2': 'Jusqu\'à 90%', 'Réservoir': '1 L', 'Longueur tuyau': '2.1 m', 'Sans latex': 'Oui', 'Conditionnement': 'Boîte 10' },
      sku: 'PNEU-MASQ-001', position: 5,
    },
    {
      name: 'Chambre d\'inhalation Pari LL Adulte',
      description: 'Chambre d\'inhalation à valve unidirectionnelle pour aérosols doseurs. Volume 750 mL, valve inspiratoire et expiratoire, compatible becs inhalateurs universels.',
      price: 1800, stock: 90, categoryId: catMap['Pneumologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1584484150880-43c9c22bbfc7?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Pari', 'Volume': '750 mL', 'Valve': 'Unidirectionnelle', 'Masque': 'Adulte + Junior', 'Compatible': 'Becs universels' },
      sku: 'PNEU-CHAM-001', position: 6,
    },

    // ── Ophtalmologie ──
    {
      name: 'Lampe à fente portative Keeler PSL ONE',
      description: 'Lampe à fente portative à LED avec batterie rechargeable. Grossissement 10×/16×, fente 0.2–14 mm, 5 largeurs. Idéale pour consultations délocalisées.',
      price: 185000, stock: 4, categoryId: catMap['Ophtalmologie'], featured: true,
      images: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Keeler', 'Grossissement': '10× / 16×', 'Fente': '0.2–14 mm', 'Éclairage': 'LED', 'Autonomie': '8h' },
      sku: 'OPHT-LAMP-001', position: 2,
    },
    {
      name: 'Tonomètre à air non contact Nidek NT-530P',
      description: 'Tonomètre à air automatique pour mesure de la pression intraoculaire sans contact avec la cornée. 3 mesures moyennées, imprimante intégrée.',
      price: 680000, stock: 2, categoryId: catMap['Ophtalmologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1579165466949-3180a3d056d5?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Nidek', 'Méthode': 'Air sans contact', 'Plage': '0–60 mmHg', 'Moyennage': '3 mesures auto', 'Imprimante': 'Intégrée' },
      sku: 'OPHT-TONO-001', position: 3,
    },
    {
      name: 'Réfractomètre automatique Topcon KR-800',
      description: 'Auto-réfractomètre/kératomètre pour mesure de la réfraction oculaire. Mesure automatique rapide, écran tactile couleur, export USB.',
      price: 1250000, stock: 1, categoryId: catMap['Ophtalmologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1579165466949-3180a3d056d5?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Topcon', 'Type': 'Auto-réfractomètre/kératomètre', 'Plage sphère': '±25 D', 'Écran': 'Tactile couleur', 'Export': 'USB / LAN' },
      sku: 'OPHT-REFR-001', position: 4,
    },
    {
      name: 'Échelle d\'acuité visuelle Snellen rétro-éclairée',
      description: 'Boîte lumineuse avec charte Snellen standard pour mesure d\'acuité à 6 m. Optotypes 0.1 à 1.5, alimentation secteur, interrupteur sur câble.',
      price: 28000, stock: 12, categoryId: catMap['Ophtalmologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Type': 'Rétro-éclairée', 'Optotypes': 'Snellen 0.1–1.5', 'Dimensions': '40×20 cm', 'Distance test': '6 m', 'Alimentation': 'Secteur 230V' },
      sku: 'OPHT-CHART-001', position: 5,
    },
    {
      name: 'Occlusion test de couverture (pack 12)',
      description: 'Cartes d\'occultation pour test de couverture en ophtalmologie pédiatrique. Pack de 12 motifs variés, double face, plastifié lavable.',
      price: 890, stock: 40, categoryId: catMap['Ophtalmologie'], featured: false,
      images: ['https://images.unsplash.com/photo-1579165466949-3180a3d056d5?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Motifs': '12 variés', 'Double face': 'Oui', 'Plastifié': 'Lavable', 'Usage': 'Ophtalmologie pédiatrique', 'Dimensions': '15×10 cm' },
      sku: 'OPHT-OCCA-001', position: 6,
    },

    // ── ORL ──
    {
      name: 'Audiomètre vocal et tonal Inventis Piano',
      description: 'Audiomètre de diagnostic 2 canaux pour audiométrie tonale et vocale. Plage 125 Hz–8000 Hz, -10 à 120 dB HL, connexion PC, logiciel inclus.',
      price: 285000, stock: 3, categoryId: catMap['ORL'], featured: true,
      images: ['https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Inventis', 'Canaux': '2', 'Plage fréquence': '125–8000 Hz', 'Plage niveau': '-10–120 dB HL', 'Logiciel': 'Inventis Suite inclus' },
      sku: 'ORL-AUDIO-001', position: 2,
    },
    {
      name: 'Otoscope vidéo Heine iC1 pour iPhone',
      description: 'Otoscope vidéo compatible iPhone 11-15 et Samsung S. Capuchon illuminé LED, grossissement 3.7×, capture photo/vidéo HD. Application gratuite.',
      price: 42000, stock: 10, categoryId: catMap['ORL'], featured: false,
      images: ['https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Heine', 'Grossissement': '3.7×', 'Éclairage': 'LED', 'Compatible': 'iPhone 11-15 + Samsung S', 'Résolution': '1080p HD' },
      sku: 'ORL-VIDOTO-001', position: 3,
    },
    {
      name: 'Spéculum nasal Killian acier 10 cm',
      description: 'Spéculum nasal de Killian 10 cm avec branche mobile. Acier inox poli miroir, autoclavable. Mors longs pour rhinoscopie postérieure.',
      price: 1900, stock: 70, categoryId: catMap['ORL'], featured: false,
      images: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Longueur': '10 cm', 'Mors': 'Longs', 'Finition': 'Poli miroir', 'Matériau': 'Acier inox', 'Stérilisation': 'Autoclave 134°C' },
      sku: 'ORL-SPEC-001', position: 4,
    },
    {
      name: 'Miroir de Clar frontal réglable',
      description: 'Miroir de Clar à réflexion frontale, monture légère en plastique blanc réglable. Diamètre 9 cm, utilisation avec lampe de bureau ou frontale.',
      price: 3500, stock: 25, categoryId: catMap['ORL'], featured: false,
      images: ['https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Diamètre': '9 cm', 'Matériau': 'Plastique + verre', 'Réglage': 'Inclinaison 360°', 'Bandeau': 'Élastique ajustable', 'Usage': 'ORL / Laryngologie' },
      sku: 'ORL-CLAR-001', position: 5,
    },
    {
      name: 'Diapason médical 512 Hz aluminium',
      description: 'Diapason diagnostic 512 Hz en alliage aluminium. Test de Rinne et Weber pour évaluation auditive. Poids équilibré 42 g, manche antidérapant.',
      price: 1800, stock: 50, categoryId: catMap['ORL'], featured: false,
      images: ['https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Fréquence': '512 Hz', 'Matériau': 'Aluminium', 'Poids': '42 g', 'Tests': 'Rinne + Weber', 'Étui': 'Inclus' },
      sku: 'ORL-DIAP-001', position: 6,
    },

    // ── Urgences (suite) ──
    {
      name: 'Collier cervical Stifneck Select adulte',
      description: 'Collier cervical à taille unique réglable en 6 positions. Structure polyéthylène rigide, fenêtre trachée, lavable. Norme EN1871.',
      price: 3200, stock: 30, categoryId: catMap['Urgences'], featured: false,
      images: ['https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Laerdal', 'Tailles': '6 positions (1 collier)', 'Matériau': 'Polyéthylène', 'Fenêtre': 'Trachée visible', 'Norme': 'EN 1871' },
      sku: 'URG-COLL-001', position: 4,
    },
    {
      name: 'Couvertures de survie aluminium (boîte 10)',
      description: 'Couvertures isothermiques aluminium/polyester. Rétention chaleur 90%, imperméables. Usage unique, stériles. Dimensions 210×160 cm. Boîte 10.',
      price: 1500, stock: 100, categoryId: catMap['Urgences'], featured: false,
      images: ['https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Dimensions': '210×160 cm', 'Rétention chaleur': '90%', 'Imperméable': 'Oui', 'Usage': 'Unique', 'Conditionnement': 'Boîte 10' },
      sku: 'URG-COUV-001', position: 5,
    },
    {
      name: 'Oxymètre de pouls portable urgence Masimo MightySat',
      description: 'Oxymètre au doigt Masimo pour urgences et terrain. Technologie SET® signal extraction. SpO2, SpCO, SpMet, FC, IR, IVP. Bluetooth intégré.',
      price: 42000, stock: 0, categoryId: catMap['Urgences'], featured: false,
      images: ['https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Masimo', 'Paramètres': 'SpO2 / SpCO / SpMet / FC', 'Technologie': 'SET®', 'Connectivité': 'Bluetooth 4.0', 'Autonomie': '24h' },
      sku: 'URG-OXY-002', position: 6,
    },
    {
      name: 'Trousse de premiers secours Sanitaire ESSENTIEL',
      description: 'Trousse de 1ers secours pour véhicules sanitaires. Contenu : compresses, pansements, triangles de tissu, gants nitrile, garrot CAT, masque RCP.',
      price: 8900, stock: 20, categoryId: catMap['Urgences'], featured: false,
      images: ['https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Contenu': '40+ références', 'Format': 'Trousse souple', 'Dimensions': '28×22×10 cm', 'Norme': 'EN 13169', 'Poids': '1.2 kg' },
      sku: 'URG-TROUSSE-002', position: 7,
    },

    // ── Pédiatrie (suite) ──
    {
      name: 'Nébuliseur pédiatrique Pari Baby',
      description: 'Nébuliseur à compresseur avec masque pédiatrique anatomique (0–2 ans et 2–5 ans). MMAD 3.5 µm, débit 3 L/min. Très silencieux 55 dB.',
      price: 7500, stock: 20, categoryId: catMap['Pédiatrie'], featured: false,
      images: ['https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Pari', 'MMAD': '3.5 µm', 'Débit': '3 L/min', 'Masques': 'Nourrisson + Enfant', 'Bruit': '55 dB' },
      sku: 'PED-NEB-001', position: 3,
    },
    {
      name: 'Tensiomètre pédiatrique manchon 4–8 ans Omron',
      description: 'Brassard de remplacement taille enfant pour tensiomètre Omron. Largeur 17 cm, périmètre bras 16–22 cm. Compatible Omron M6/M7.',
      price: 2500, stock: 35, categoryId: catMap['Pédiatrie'], featured: false,
      images: ['https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Omron', 'Bras': '16–22 cm', 'Compatible': 'M6 / M7 / M3', 'Âge': '4–8 ans', 'Fixation': 'Velcro' },
      sku: 'PED-TENS-001', position: 4,
    },
    {
      name: 'Stéthoscope pédiatrique Littmann Classic III Choco',
      description: 'Stéthoscope Classic III dans version pédiatrique avec décor coloré chocolat/rose pour rassurer les jeunes patients. Même qualité acoustique.',
      price: 16500, comparePrice: 18900, stock: 12, categoryId: catMap['Pédiatrie'], featured: true,
      images: ['https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Marque': 'Littmann 3M', 'Pavillon': 'Pédiatrique', 'Couleur': 'Choco/Rose', 'Longueur': '69 cm', 'Garantie': '5 ans' },
      sku: 'PED-STETH-001', position: 5,
    },
    {
      name: 'Couche de change médicale jetable (carton 100)',
      description: 'Alèses protectrices 60×60 cm pour tables d\'examen pédiatrique. Super-absorbantes, imperméables, surface douce non tissé. Carton 100.',
      price: 2200, stock: 200, categoryId: catMap['Pédiatrie'], featured: false,
      images: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&h=800&q=80'],
      specs: { 'Dimensions': '60×60 cm', 'Absorption': '500 mL', 'Surface': 'Non tissé doux', 'Imperméable': 'Oui', 'Conditionnement': 'Carton 100' },
      sku: 'PED-ALESE-001', position: 6,
    },
  ];

  const products = await Promise.all(
    productsData.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          slug: slugify(p.name),
          description: p.description,
          price: p.price,
          comparePrice: p.comparePrice,
          stock: p.stock,
          categoryId: p.categoryId,
          featured: p.featured,
          images: p.images,
          specs: p.specs,
          sku: p.sku,
          position: p.position,
          active: true,
        },
      }),
    ),
  );

  // ─── ADDRESSES ────────────────────────────────────
  console.log('[Seed] Creation des adresses...');
  const addresses = await Promise.all([
    prisma.address.create({
      data: {
        userId: users[2].id, label: 'Cabinet principal', firstName: 'Sophie', lastName: 'Martin',
        street: '12 rue de la Santé', city: 'Paris', postalCode: '75014', country: 'FR', phone: '01 45 89 12 34', isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: users[3].id, label: 'Cabinet Dr Dupont', firstName: 'Pierre', lastName: 'Dupont',
        street: '8 avenue Pasteur', city: 'Lyon', postalCode: '69003', country: 'FR', phone: '04 78 23 45 67', isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: users[4].id, label: 'Clinique', firstName: 'Isabelle', lastName: 'Leroy',
        street: '45 boulevard Haussmann', city: 'Paris', postalCode: '75009', country: 'FR', phone: '01 42 12 98 76', isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: users[7].id, label: 'Cabinet Lyon Centre', firstName: 'Laurent', lastName: 'Girard',
        street: '3 place Bellecour', city: 'Lyon', postalCode: '69002', country: 'FR', phone: '04 72 56 78 90', isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: users[8].id, label: 'Cabinet cardiologie', firstName: 'Thomas', lastName: 'Petit',
        street: '22 rue de Rennes', city: 'Paris', postalCode: '75006', country: 'FR', phone: '01 43 56 78 12', isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: users[9].id, label: 'Clinique Bordeaux', firstName: 'Marc', lastName: 'Durand',
        street: '15 cours de l\'Intendance', city: 'Bordeaux', postalCode: '33000', country: 'FR', phone: '05 56 34 56 78', isDefault: true,
      },
    }),
  ]);

  // ─── REVIEWS ──────────────────────────────────────
  console.log('[Seed] Creation des avis...');
  await Promise.all([
    prisma.review.create({ data: { userId: users[2].id, productId: products[0].id, rating: 5, comment: 'Stéthoscope d\'excellente qualité acoustique. Je l\'utilise quotidiennement en consultation.' } }),
    prisma.review.create({ data: { userId: users[3].id, productId: products[0].id, rating: 5, comment: 'Fidèle à la réputation Littmann. Confort et performances au rendez-vous.' } }),
    prisma.review.create({ data: { userId: users[4].id, productId: products[1].id, rating: 4, comment: 'Bonne précision de mesure. Le brassard universel est très pratique pour tous les patients.' } }),
    prisma.review.create({ data: { userId: users[6].id, productId: products[3].id, rating: 5, comment: 'Parfait en pédiatrie, mesure rapide et fiable. Les parents apprécient l\'Age Precision.' } }),
    prisma.review.create({ data: { userId: users[5].id, productId: products[16].id, rating: 5, comment: 'L\'échographe Butterfly a révolutionné mes consultations. Portable et d\'une qualité d\'image surprenante.' } }),
    prisma.review.create({ data: { userId: users[8].id, productId: products[28].id, rating: 5, comment: 'ECG 12 pistes très complet. L\'interprétation automatique aide beaucoup au quotidien.' } }),
    prisma.review.create({ data: { userId: users[8].id, productId: products[29].id, rating: 4, comment: 'Bon DSA, l\'assistance RCP est un vrai plus. Formation rapide pour le personnel.' } }),
    prisma.review.create({ data: { userId: users[7].id, productId: products[6].id, rating: 5, comment: 'Table d\'examen robuste et bien finie. Le réglage hydraulique est très fluide.' } }),
    prisma.review.create({ data: { userId: users[4].id, productId: products[24].id, rating: 4, comment: 'Autoclave fiable avec une bonne traçabilité. Le support technique Euronda est réactif.' } }),
    prisma.review.create({ data: { userId: users[3].id, productId: products[4].id, rating: 5, comment: 'Otoscope Heine de référence. Éclairage halogène brillant, vision parfaite du tympan.' } }),
    prisma.review.create({ data: { userId: users[2].id, productId: products[18].id, rating: 4, comment: 'Gants nitrile de bonne qualité. Bon ajustement, pas d\'allergie au latex.' } }),
    prisma.review.create({ data: { userId: users[9].id, productId: products[34].id, rating: 5, comment: 'Zoll AED 3 : écran clair, instructions vocales rassurantes. Indispensable dans tout cabinet.' } }),
    prisma.review.create({ data: { userId: users[6].id, productId: products[35].id, rating: 5, comment: 'Pèse-bébé précis avec une bonne stabilité. La fonction HOLD est indispensable avec les nourrissons agités !' } }),
    prisma.review.create({ data: { userId: users[11].id, productId: products[2].id, rating: 4, comment: 'Oxymètre professionnel, mesure fiable même au froid. Un peu cher mais qualité Nonin.' } }),
  ]);

  // ─── ORDERS ───────────────────────────────────────
  console.log('[Seed] Creation des commandes...');
  const orderData = [
    {
      userId: users[2].id, addressId: addresses[0].id, status: OrderStatus.DELIVERED,
      items: [
        { productId: products[0].id, quantity: 2, unitPrice: products[0].price },
        { productId: products[1].id, quantity: 1, unitPrice: products[1].price },
      ],
    },
    {
      userId: users[3].id, addressId: addresses[1].id, status: OrderStatus.DELIVERED,
      items: [
        { productId: products[4].id, quantity: 1, unitPrice: products[4].price },
        { productId: products[18].id, quantity: 10, unitPrice: products[18].price },
        { productId: products[19].id, quantity: 5, unitPrice: products[19].price },
      ],
    },
    {
      userId: users[4].id, addressId: addresses[2].id, status: OrderStatus.SHIPPED,
      items: [
        { productId: products[6].id, quantity: 1, unitPrice: products[6].price },
        { productId: products[8].id, quantity: 3, unitPrice: products[8].price },
      ],
    },
    {
      userId: users[8].id, addressId: addresses[4].id, status: OrderStatus.DELIVERED,
      items: [
        { productId: products[28].id, quantity: 1, unitPrice: products[28].price },
        { productId: products[30].id, quantity: 1, unitPrice: products[30].price },
      ],
    },
    {
      userId: users[7].id, addressId: addresses[3].id, status: OrderStatus.PROCESSING,
      items: [
        { productId: products[24].id, quantity: 1, unitPrice: products[24].price },
        { productId: products[25].id, quantity: 5, unitPrice: products[25].price },
        { productId: products[26].id, quantity: 3, unitPrice: products[26].price },
      ],
    },
    {
      userId: users[9].id, addressId: addresses[5].id, status: OrderStatus.CONFIRMED,
      items: [
        { productId: products[16].id, quantity: 1, unitPrice: products[16].price },
        { productId: products[34].id, quantity: 2, unitPrice: products[34].price },
      ],
    },
    {
      userId: users[2].id, addressId: addresses[0].id, status: OrderStatus.PENDING,
      items: [
        { productId: products[31].id, quantity: 1, unitPrice: products[31].price },
        { productId: products[32].id, quantity: 1, unitPrice: products[32].price },
      ],
    },
    {
      userId: users[5].id, addressId: null, status: OrderStatus.CANCELED,
      items: [
        { productId: products[13].id, quantity: 1, unitPrice: products[13].price },
      ],
    },
    {
      userId: users[6].id, addressId: null, status: OrderStatus.DELIVERED,
      items: [
        { productId: products[35].id, quantity: 1, unitPrice: products[35].price },
        { productId: products[36].id, quantity: 1, unitPrice: products[36].price },
        { productId: products[3].id, quantity: 2, unitPrice: products[3].price },
      ],
    },
    {
      userId: users[3].id, addressId: addresses[1].id, status: OrderStatus.DELIVERED,
      items: [
        { productId: products[21].id, quantity: 20, unitPrice: products[21].price },
        { productId: products[25].id, quantity: 10, unitPrice: products[25].price },
      ],
    },
  ];

  for (const order of orderData) {
    const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const tax = Math.round(subtotal * 0.2);
    const shippingCost = subtotal > 10000 ? 0 : 1500;
    await prisma.order.create({
      data: {
        userId: order.userId,
        addressId: order.addressId,
        status: order.status,
        subtotal,
        tax,
        shippingCost,
        total: subtotal + tax + shippingCost,
        items: { create: order.items.map((it) => ({ ...it, total: it.unitPrice * it.quantity })) },
      },
    });
  }

  // ─── CONTACTS ─────────────────────────────────────
  console.log('[Seed] Creation des messages de contact...');
  await Promise.all([
    prisma.contact.create({
      data: { userId: users[2].id, name: 'Dr. Sophie Martin', email: 'dr.martin@cabinet-martin.fr', subject: 'Demande de devis autoclave', message: 'Bonjour, je souhaiterais obtenir un devis pour un autoclave Euronda E9 18L avec formation sur site. Merci.', read: false },
    }),
    prisma.contact.create({
      data: { name: 'Dr. Lemaire', email: 'lemaire@medgen.fr', subject: 'Délai de livraison ECG', message: 'Bonjour, quel est le délai de livraison pour l\'ECG Schiller CARDIOVIT AT-2plus ? Nous en avons besoin dans 10 jours.', read: false },
    }),
    prisma.contact.create({
      data: { userId: users[7].id, name: 'Cabinet Lyon Centre', email: 'cabinet.lyon@mail.fr', subject: 'Retour produit défectueux', message: 'Bonjour, le tensiomètre Omron M6 reçu la semaine dernière présente un défaut d\'affichage. Merci de m\'indiquer la procédure de retour SAV.', read: true, resolved: false },
    }),
    prisma.contact.create({
      data: { name: 'Secrétariat Dr. Bouchard', email: 'secretariat@bouchard.fr', subject: 'Commande groupée consommables', message: 'Nous souhaitons passer une commande groupée de gants, compresses et seringues pour notre cabinet de 5 praticiens. Y a-t-il des tarifs dégressifs à partir de certaines quantités ?', read: false },
    }),
    prisma.contact.create({
      data: { userId: users[9].id, name: 'Clinique Bordeaux Santé', email: 'clinique.bordeaux@mail.fr', subject: 'Formation utilisation échographe', message: 'Nous avons acquis un Butterfly iQ3. Proposez-vous des sessions de formation pour nos médecins ?', read: true, resolved: true },
    }),
  ]);

  // ─── CAROUSEL SLIDES ─────────────────────────────
  console.log('[Seed] Creation du carousel...');
  const slides = await Promise.all([
    prisma.carouselSlide.create({
      data: {
        title: 'Matériel de diagnostic de pointe',
        subtitle: 'Stéthoscopes, tensiomètres, oxymètres — Équipez votre cabinet avec les meilleures marques',
        image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1920&h=800&q=80',
        link: '/products?category=diagnostic',
        position: 1,
        active: true,
      },
    }),
    prisma.carouselSlide.create({
      data: {
        title: 'Échographes portables nouvelle génération',
        subtitle: 'Découvrez le Butterfly iQ3 — L\'échographie au bout des doigts',
        image: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1920&h=800&q=80',
        link: '/products?category=imagerie-medicale',
        position: 2,
        active: true,
      },
    }),
    prisma.carouselSlide.create({
      data: {
        title: 'Livraison gratuite dès 100€ HT',
        subtitle: 'Sur tout le catalogue de consommables et matériel médical',
        image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1920&h=800&q=80',
        link: '/products',
        position: 3,
        active: true,
      },
    }),
  ]);

  // ─── Traductions placeholders (EN/AR) ────────────────────────────
  // Keep localized records available after each seed run.
  const translationLocales = ['en', 'ar'] as const;

  await prisma.productTranslation.createMany({
    data: products.flatMap((product) =>
      translationLocales.map((locale) => ({
        productId: product.id,
        locale,
        name: product.name,
        description: product.description,
      })),
    ),
    skipDuplicates: true,
  });

  await prisma.categoryTranslation.createMany({
    data: categories.flatMap((category) =>
      translationLocales.map((locale) => ({
        categoryId: category.id,
        locale,
        name: category.name,
        description: category.description,
      })),
    ),
    skipDuplicates: true,
  });

  await prisma.carouselSlideTranslation.createMany({
    data: slides.flatMap((slide) =>
      translationLocales.map((locale) => ({
        slideId: slide.id,
        locale,
        title: slide.title,
        subtitle: slide.subtitle,
      })),
    ),
    skipDuplicates: true,
  });

  // ─── Règles de livraison ───────────────────────────────────────────
  console.log('[Seed] Regles de livraison...');
  const shippingRules = await Promise.all([
    prisma.shippingRule.create({
      data: {
        label: 'Grandes pièces / commande importante',
        type: ShippingRuleType.CUSTOM,
        minSubtotal: 200000,
        message: 'Nous contacter pour un devis de livraison',
        priority: 0,
      },
    }),
    prisma.shippingRule.create({
      data: {
        label: 'Livraison offerte',
        type: ShippingRuleType.FREE_ABOVE,
        minSubtotal: 10000,
        amount: 0,
        priority: 1,
      },
    }),
    prisma.shippingRule.create({
      data: {
        label: 'Livraison standard',
        type: ShippingRuleType.FLAT,
        amount: 499,
        priority: 2,
      },
    }),
  ]);

  console.log('[Seed] Termine avec succes !');
  console.log(`   - ${users.length} utilisateurs (admin: admin@althea-system.fr / Password123!)`);
  console.log(`   - ${categories.length} categories medicales`);
  console.log(`   - ${products.length} produits medicaux`);
  console.log(`   - ${orderData.length} commandes`);
  console.log(`   - 14 avis`);
  console.log(`   - 5 messages de contact`);
  console.log(`   - 3 slides carousel`);
  console.log(`   - ${addresses.length} adresses`);
  console.log(`   - ${shippingRules.length} regles de livraison`);
}

main()
  .catch((e) => {
    console.error('[Seed] Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
