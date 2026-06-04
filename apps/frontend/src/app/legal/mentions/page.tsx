import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';

export const metadata = {
  title: 'Mentions légales — Althea System',
  description: 'Mentions légales obligatoires de la plateforme Althea System.',
};

export default function MentionsLegalesPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-2 text-3xl font-bold">Mentions légales</h1>
        <p className="mb-10 text-sm text-muted-foreground">Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN)</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground">

          <section aria-labelledby="ml-editeur">
            <h2 id="ml-editeur" className="text-xl font-semibold mb-2">1. Éditeur du site</h2>
            <p className="text-muted-foreground">
              <strong>Althea System</strong> — Projet étudiant réalisé dans le cadre du cursus
              Bachelor CPI 2025-2026, SUP de Vinci, Paris La Défense.<br />
              Directeur de la publication : équipe projet Althea System.<br />
              Adresse : Paris, France.<br />
              Email : <a href="mailto:contact@althea-system.fr" className="text-althea-cta underline">contact@althea-system.fr</a><br />
              Téléphone : +33 1 23 45 67 89
            </p>
          </section>

          <section aria-labelledby="ml-hebergement">
            <h2 id="ml-hebergement" className="text-xl font-semibold mb-2">2. Hébergement</h2>
            <p className="text-muted-foreground">
              Le frontend de ce site est hébergé par :<br />
              <strong>Vercel Inc.</strong> — 340 S Lemon Ave #4133, Walnut, CA 91789, USA.<br />
              Site : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-althea-cta underline">vercel.com</a>
            </p>
            <p className="text-muted-foreground mt-2">
              Le backend et la base de données sont hébergés par :<br />
              <strong>Render Inc.</strong> — San Francisco, CA, USA.<br />
              Site : <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-althea-cta underline">render.com</a>
            </p>
          </section>

          <section aria-labelledby="ml-propriete">
            <h2 id="ml-propriete" className="text-xl font-semibold mb-2">3. Propriété intellectuelle</h2>
            <p className="text-muted-foreground">
              L'ensemble du contenu de ce site (textes, images, logos, code source, base de données,
              interface graphique) est protégé par le droit d'auteur et constitue la propriété
              exclusive d'Althea System ou de ses auteurs. Toute reproduction, représentation,
              modification, publication ou adaptation, totale ou partielle, de l'un quelconque des
              éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans
              l'autorisation écrite préalable d'Althea System, sous peine de poursuites judiciaires.
            </p>
          </section>

          <section aria-labelledby="ml-donnees">
            <h2 id="ml-donnees" className="text-xl font-semibold mb-2">4. Données personnelles</h2>
            <p className="text-muted-foreground">
              La collecte et le traitement des données personnelles des utilisateurs sont effectués
              conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE
              2016/679) et à la loi Informatique et Libertés. Pour plus d'informations, consultez
              notre{' '}
              <a href="/legal/privacy" className="text-althea-cta underline">Politique de confidentialité</a>.
            </p>
          </section>

          <section aria-labelledby="ml-cookies">
            <h2 id="ml-cookies" className="text-xl font-semibold mb-2">5. Cookies</h2>
            <p className="text-muted-foreground">
              Ce site utilise uniquement des cookies techniques indispensables à son fonctionnement
              (authentification, gestion du panier, préférences de langue). Aucun cookie publicitaire
              ou traceur tiers n'est utilisé. L'utilisation du site vaut acceptation de ces cookies.
            </p>
          </section>

          <section aria-labelledby="ml-liens">
            <h2 id="ml-liens" className="text-xl font-semibold mb-2">6. Liens hypertextes</h2>
            <p className="text-muted-foreground">
              La création de liens hypertextes vers le site althea-system.fr est soumise à
              l'autorisation préalable d'Althea System. Les liens pointant vers des sites tiers
              n'engagent pas la responsabilité d'Althea System quant à leur contenu.
            </p>
          </section>

          <section aria-labelledby="ml-responsabilite">
            <h2 id="ml-responsabilite" className="text-xl font-semibold mb-2">7. Limitation de responsabilité</h2>
            <p className="text-muted-foreground">
              Althea System s'efforce de maintenir les informations présentes sur ce site à jour
              et exactes. Toutefois, aucune garantie n'est donnée quant à l'exhaustivité ou
              l'exactitude des informations publiées. L'utilisation du site se fait sous la seule
              responsabilité de l'utilisateur. Althea System ne saurait être tenu responsable des
              dommages directs ou indirects résultant de l'accès ou de l'utilisation du site.
            </p>
          </section>

          <section aria-labelledby="ml-droit">
            <h2 id="ml-droit" className="text-xl font-semibold mb-2">8. Droit applicable</h2>
            <p className="text-muted-foreground">
              Les présentes mentions légales sont régies par le droit français. En cas de litige,
              les tribunaux de Paris seront seuls compétents.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
