import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { streamText, createUIMessageStreamResponse, convertToModelMessages, type LanguageModel } from 'ai';

export const maxDuration = 30;

/* ------------------------------------------------------------------ */
/*  Base de connaissances locale (mode sans clé API)                  */
/* ------------------------------------------------------------------ */
const KB: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['livraison', 'frais', 'shipping', 'expedition', 'port'],
    answer:
      'Chez Althea System, la livraison est gratuite pour toute commande superieure a 100 EUR HT. En dessous, un forfait de 4,99 EUR est applique. Pour les equipements volumineux (commande > 2 000 EUR HT), nous vous invitons a nous contacter pour organiser une livraison adaptee.',
  },
  {
    keywords: ['retour', 'renvoi', 'remboursement', 'echange', 'rembourser'],
    answer:
      "Vous disposez de 14 jours apres reception pour retourner un produit (droit de retractation legal). Les produits doivent etre retournes dans leur emballage d'origine et en parfait etat. Contactez notre service client pour obtenir une etiquette de retour.",
  },
  {
    keywords: ['paiement', 'payer', 'carte', 'virement', 'stripe', 'moyen'],
    answer:
      'Nous acceptons les paiements par carte bancaire (Visa, Mastercard, CB) via notre plateforme securisee Stripe. Le paiement par virement est egalement possible pour les commandes professionnelles. Tous les paiements sont securises et chiffres.',
  },
  {
    keywords: ['compte', 'inscription', 'profil', 'mot de passe', 'connexion', 'register'],
    answer:
      "Pour creer un compte, cliquez sur \"Connexion\" puis \"Creer un compte\". Vous aurez acces a votre tableau de bord, l'historique de vos commandes, vos adresses enregistrees et cet assistant IA. Vous pouvez modifier vos informations dans Parametres.",
  },
  {
    keywords: ['commande', 'suivi', 'statut', 'order', 'suivre'],
    answer:
      'Vous pouvez suivre vos commandes dans votre tableau de bord, section "Mes commandes". Chaque commande affiche son statut : En attente, Confirmee, En preparation, Expediee, Livree. Vous recevez un email a chaque changement de statut.',
  },
  {
    keywords: ['produit', 'catalogue', 'article', 'equipement', 'medical', 'materiel'],
    answer:
      "Althea System propose un catalogue d'equipements medicaux professionnels : stethoscopes, tensiometres, otoscopes, oxymetres, mobilier medical et consommables. Tous nos produits sont certifies CE et conformes aux normes en vigueur. Utilisez la barre de recherche pour trouver un produit specifique.",
  },
  {
    keywords: ['prix', 'ht', 'ttc', 'tva', 'tarif', 'reduction', 'promo'],
    answer:
      'Les prix affiches sont HT (Hors Taxes). La TVA applicable (20%, 10% ou 5,5% selon le produit) est calculee automatiquement. Le prix TTC est affiche dans le panier. Des promotions ponctuelles peuvent etre proposees sur certains produits.',
  },
  {
    keywords: ['contact', 'telephone', 'email', 'support', 'aide', 'joindre'],
    answer:
      'Vous pouvez nous contacter via le formulaire de contact accessible depuis le menu principal, ou directement par email. Notre equipe repond sous 24 a 48 heures ouvrees. Pour les urgences, privilegiez le formulaire avec le sujet "Urgent".',
  },
  {
    keywords: ['stock', 'disponible', 'rupture', 'disponibilite', 'dispo'],
    answer:
      'La disponibilite est affichee en temps reel sur chaque fiche produit. Si un produit est en rupture de stock, vous pouvez nous contacter pour connaitre la prochaine date de reapprovisionnement.',
  },
  {
    keywords: ['facture', 'comptabilite', 'justificatif', 'devis'],
    answer:
      "Une facture est generee automatiquement pour chaque commande et envoyee par email. Vous pouvez egalement la retrouver dans votre espace \"Mes commandes\". Pour un devis personnalise, contactez-nous via le formulaire de contact.",
  },
  {
    keywords: ['althea', 'qui', 'quoi', 'presentation', 'entreprise', 'societe'],
    answer:
      "Althea System est une plateforme e-commerce specialisee dans la vente d'equipements medicaux professionnels. Notre mission est de fournir du materiel de qualite aux professionnels de sante, avec un service client reactif et des prix competitifs.",
  },
  {
    keywords: ['rgpd', 'donnees', 'confidentialite', 'vie privee', 'cookie'],
    answer:
      "Althea System respecte le RGPD. Vos donnees personnelles sont protegees et ne sont jamais revendues. Vous pouvez demander la suppression de votre compte et de toutes vos donnees a tout moment depuis les parametres de votre profil ou en contactant notre support.",
  },
  {
    keywords: ['bonjour', 'salut', 'hello', 'hey', 'coucou', 'bonsoir'],
    answer:
      "Bonjour ! Je suis l'assistant virtuel Althea. Je peux vous aider sur : les produits, les commandes, les livraisons, les paiements, votre compte, et plus encore. Que puis-je faire pour vous ?",
  },
  {
    keywords: ['merci', 'thanks', 'super', 'parfait', 'genial', 'top'],
    answer:
      "Avec plaisir ! N'hesitez pas si vous avez d'autres questions. Je suis la pour vous aider.",
  },
];

const DEFAULT_ANSWER =
  "Je suis l'assistant Althea System. Je peux vous renseigner sur nos produits medicaux, vos commandes, la livraison, les paiements, votre compte, ou tout autre sujet lie a notre plateforme. Pouvez-vous preciser votre question ?";

function findLocalAnswer(userMessage: string): string {
  const lower = userMessage.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch = { score: 0, answer: DEFAULT_ANSWER };
  for (const entry of KB) {
    const score = entry.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestMatch.score) bestMatch = { score, answer: entry.answer };
  }
  return bestMatch.answer;
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */
/** Extrait le texte d'un message (format UIMessage v6 avec parts, ou ancien format content) */
function extractMessageText(msg: any): string {
  if (typeof msg?.content === 'string' && msg.content) return msg.content;
  if (Array.isArray(msg?.parts)) {
    return msg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text ?? '')
      .join(' ');
  }
  return '';
}

function hasKey(key: string | undefined) {
  return !!key && !key.includes('your-');
}

/* ------------------------------------------------------------------ */
/*  Récupération produits depuis le backend                            */
/* ------------------------------------------------------------------ */
const PRODUCT_KEYWORDS = [
  'produit', 'article', 'catalogue', 'stethoscope', 'tensiometre', 'otoscope',
  'oxymetre', 'mobilier', 'consommable', 'materiel', 'equipement', 'recommande',
  'conseil', 'acheter', 'commander', 'prix', 'tarif', 'stock', 'disponible',
  'cherche', 'trouver', 'avoir', 'vendre', 'vente', 'medical',
];

function isProductQuery(text: string): boolean {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return PRODUCT_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchProductContext(query: string): Promise<string> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const params = new URLSearchParams({ search: query, limit: '8', active: 'true' });
    const res = await fetch(`${apiUrl}/api/products?${params}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const products: any[] = data?.data ?? data?.products ?? data?.items ?? [];
    if (!products.length) return '';

    const lines = products.map((p: any) => {
      const price = p.price ? `${(p.price / 100).toFixed(2)} €` : 'prix sur demande';
      const stock = p.stock > 0 ? `en stock (${p.stock})` : 'rupture de stock';
      return `- ${p.name} | ${price} | ${stock}${p.description ? ` | ${p.description.slice(0, 80)}` : ''}`;
    });
    return `\n\nProduits disponibles dans le catalogue Althea System :\n${lines.join('\n')}\n\nUtilise ces données pour recommander des produits pertinents.`;
  } catch {
    return '';
  }
}

function pickModel(): LanguageModel | null {
  // Priorité : Groq → Gemini → OpenAI → Anthropic
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (hasKey(groqKey)) {
    const groq = createGroq({ apiKey: groqKey });
    return groq('llama-3.3-70b-versatile') as unknown as LanguageModel;
  }
  if (hasKey(geminiKey)) {
    return google('gemini-2.0-flash') as unknown as LanguageModel;
  }
  if (hasKey(openaiKey)) {
    return openai('gpt-4o') as unknown as LanguageModel;
  }
  if (hasKey(anthropicKey)) {
    return anthropic('claude-haiku-4-5') as unknown as LanguageModel;
  }
  return null;
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  const selectedModel = pickModel();

  if (selectedModel) {
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    const userText = extractMessageText(lastUserMessage);

    const productContext = isProductQuery(userText)
      ? await fetchProductContext(userText)
      : '';

    const result = streamText({
      model: selectedModel,
      system:
        "Tu es Althea, un assistant intelligent pour la plateforme Althea System (vente d'equipements medicaux professionnels). Tu reponds en francais, de maniere claire, concise et utile." +
        productContext,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  }

  /* -- Mode local : réponses par mots-clés, sans clé API -- */
  const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
  const answer = findLocalAnswer(extractMessageText(lastUserMessage));

  const textPartId = 'local-text-0';
  const stream = new ReadableStream<any>({
    start(controller) {
      controller.enqueue({ type: 'text-start', id: textPartId });
      controller.enqueue({ type: 'text-delta', id: textPartId, delta: answer });
      controller.enqueue({ type: 'text-end', id: textPartId });
      controller.enqueue({
        type: 'finish',
        finishReason: 'stop',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });
      controller.close();
    },
  });

  return createUIMessageStreamResponse({ stream });
}
