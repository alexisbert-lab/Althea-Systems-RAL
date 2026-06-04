import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';

export const metadata = {
  title: 'Conditions Générales de Vente — Althea System',
  description: 'Conditions générales de vente applicables aux achats effectués sur la plateforme Althea System.',
};

export default function CGVPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-2 text-3xl font-bold">Conditions Générales de Vente</h1>
        <p className="mb-10 text-sm text-muted-foreground">En vigueur au 1er janvier 2025 — Dernière mise à jour : mai 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground">

          <section aria-labelledby="art1">
            <h2 id="art1" className="text-xl font-semibold mb-2">Article 1 — Objet et champ d'application</h2>
            <p className="text-muted-foreground">
              Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des ventes de
              produits conclues entre la société Althea System (ci-après « le Vendeur ») et tout
              consommateur ou professionnel (ci-après « l'Acheteur ») via la plateforme
              <strong> althea-system.fr</strong>. Toute commande passée sur le site implique
              l'acceptation sans réserve des présentes CGV, qui prévalent sur tout autre document
              émanant de l'Acheteur.
            </p>
          </section>

          <section aria-labelledby="art2">
            <h2 id="art2" className="text-xl font-semibold mb-2">Article 2 — Identification du Vendeur</h2>
            <p className="text-muted-foreground">
              Althea System — Projet étudiant réalisé dans le cadre du cursus Bachelor CPI SUP de Vinci.<br />
              Siège social : Paris, France.<br />
              Contact : <a href="mailto:contact@althea-system.fr" className="text-althea-cta underline">contact@althea-system.fr</a> — +33 1 23 45 67 89.
            </p>
          </section>

          <section aria-labelledby="art3">
            <h2 id="art3" className="text-xl font-semibold mb-2">Article 3 — Produits et disponibilité</h2>
            <p className="text-muted-foreground">
              Les produits proposés à la vente sont ceux figurant dans le catalogue en ligne au moment
              de la consultation. Althea System s'efforce de maintenir le catalogue à jour. En cas
              d'indisponibilité d'un produit après passation de la commande, l'Acheteur en sera informé
              dans les meilleurs délais et pourra choisir entre un remboursement intégral ou un produit
              de remplacement de valeur équivalente.
            </p>
          </section>

          <section aria-labelledby="art4">
            <h2 id="art4" className="text-xl font-semibold mb-2">Article 4 — Prix</h2>
            <p className="text-muted-foreground">
              Les prix sont indiqués en euros (€), toutes taxes comprises (TTC), hors frais de livraison.
              Le montant des frais de livraison est précisé avant la validation définitive de la commande.
              Althea System se réserve le droit de modifier ses prix à tout moment ; les produits sont
              facturés sur la base du tarif en vigueur au moment de la validation de la commande.
            </p>
          </section>

          <section aria-labelledby="art5">
            <h2 id="art5" className="text-xl font-semibold mb-2">Article 5 — Commandes</h2>
            <p className="text-muted-foreground">
              Toute commande passée sur le site constitue un contrat de vente ferme et définitif.
              L'Acheteur reconnaît avoir pris connaissance des présentes CGV avant la validation de
              sa commande, matérialisée par le clic sur le bouton « Confirmer et payer ». Un email
              de confirmation récapitulatif est adressé à l'Acheteur dans les minutes suivant la
              validation du paiement.
            </p>
          </section>

          <section aria-labelledby="art6">
            <h2 id="art6" className="text-xl font-semibold mb-2">Article 6 — Paiement</h2>
            <p className="text-muted-foreground">
              Le paiement s'effectue en ligne, au moment de la commande, par carte bancaire (Visa,
              Mastercard, American Express) ou via les solutions de paiement proposées sur le site.
              Les transactions sont sécurisées par chiffrement SSL. Althea System ne conserve aucune
              donnée bancaire de l'Acheteur.
            </p>
          </section>

          <section aria-labelledby="art7">
            <h2 id="art7" className="text-xl font-semibold mb-2">Article 7 — Livraison</h2>
            <p className="text-muted-foreground">
              Les produits sont livrés à l'adresse indiquée par l'Acheteur lors de sa commande,
              en France métropolitaine et dans les pays listés lors du passage de commande.
              Les délais indicatifs sont affichés lors de la commande. Althea System ne saurait
              être tenu responsable des retards imputables au transporteur ou à des circonstances
              exceptionnelles (grève, catastrophe naturelle, etc.).
            </p>
          </section>

          <section aria-labelledby="art8">
            <h2 id="art8" className="text-xl font-semibold mb-2">Article 8 — Droit de rétractation</h2>
            <p className="text-muted-foreground">
              Conformément à l'article L. 221-18 du Code de la consommation, l'Acheteur consommateur
              dispose d'un délai de <strong>14 jours francs</strong> à compter de la réception du produit
              pour exercer son droit de rétractation, sans avoir à motiver sa décision. Ce droit peut
              être exercé en contactant le service client. Les frais de retour sont à la charge de
              l'Acheteur sauf si le produit est défectueux ou ne correspond pas à la commande.
              Le remboursement interviendra dans les 14 jours suivant la réception du retour.
            </p>
          </section>

          <section aria-labelledby="art9">
            <h2 id="art9" className="text-xl font-semibold mb-2">Article 9 — Garanties légales</h2>
            <p className="text-muted-foreground">
              Tous les produits bénéficient de la <strong>garantie légale de conformité</strong> (articles
              L. 217-4 et suivants du Code de la consommation) et de la <strong>garantie contre les vices
              cachés</strong> (articles 1641 et suivants du Code civil). Pour mettre en œuvre ces
              garanties, l'Acheteur doit contacter le service client en décrivant le défaut constaté.
            </p>
          </section>

          <section aria-labelledby="art10">
            <h2 id="art10" className="text-xl font-semibold mb-2">Article 10 — Responsabilité</h2>
            <p className="text-muted-foreground">
              Althea System ne saurait être tenu responsable de l'inexécution du contrat due à un
              cas de force majeure ou à un fait imprévisible et insurmontable d'un tiers au contrat.
              La responsabilité d'Althea System est limitée au montant de la commande concernée.
            </p>
          </section>

          <section aria-labelledby="art11">
            <h2 id="art11" className="text-xl font-semibold mb-2">Article 11 — Protection des données personnelles</h2>
            <p className="text-muted-foreground">
              Les données collectées lors de la commande sont traitées conformément à notre{' '}
              <a href="/legal/privacy" className="text-althea-cta underline">Politique de confidentialité</a>.
              Conformément au RGPD, l'Acheteur dispose d'un droit d'accès, de rectification et de
              suppression de ses données.
            </p>
          </section>

          <section aria-labelledby="art12">
            <h2 id="art12" className="text-xl font-semibold mb-2">Article 12 — Règlement des litiges</h2>
            <p className="text-muted-foreground">
              En cas de litige, l'Acheteur peut recourir à la médiation conventionnelle ou à tout
              autre mode alternatif de règlement des différends. À défaut de résolution amiable,
              les tribunaux compétents de Paris seront seuls compétents. Les présentes CGV sont
              soumises au droit français.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
