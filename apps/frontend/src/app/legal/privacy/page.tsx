import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';

export const metadata = {
  title: 'Politique de confidentialité — Althea System',
  description: 'Politique de confidentialité et traitement des données personnelles conformément au RGPD.',
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-2 text-3xl font-bold">Politique de confidentialité</h1>
        <p className="mb-10 text-sm text-muted-foreground">Conformément au RGPD (Règlement UE 2016/679) — En vigueur depuis le 1er janvier 2025</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground">

          <section aria-labelledby="pc-responsable">
            <h2 id="pc-responsable" className="text-xl font-semibold mb-2">1. Responsable du traitement</h2>
            <p className="text-muted-foreground">
              Le responsable du traitement de vos données personnelles est :<br />
              <strong>Althea System</strong> — Paris, France.<br />
              Email DPO : <a href="mailto:contact@althea-system.fr" className="text-althea-cta underline">contact@althea-system.fr</a>
            </p>
          </section>

          <section aria-labelledby="pc-collecte">
            <h2 id="pc-collecte" className="text-xl font-semibold mb-2">2. Données collectées</h2>
            <p className="text-muted-foreground mb-2">
              Nous collectons les catégories de données suivantes selon vos interactions :
            </p>
            <ul className="text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>Compte client</strong> : nom, prénom, adresse email, mot de passe haché.</li>
              <li><strong>Commandes</strong> : adresse de livraison, historique des achats, informations de facturation.</li>
              <li><strong>Paiement</strong> : données traitées directement par le prestataire de paiement (Stripe) — Althea System ne conserve aucune donnée bancaire.</li>
              <li><strong>Navigation</strong> : logs techniques (adresse IP, pages consultées) à des fins de sécurité et de statistiques anonymisées.</li>
              <li><strong>Contact</strong> : nom, email, contenu du message lorsque vous utilisez le formulaire de contact ou le chat.</li>
            </ul>
          </section>

          <section aria-labelledby="pc-finalites">
            <h2 id="pc-finalites" className="text-xl font-semibold mb-2">3. Finalités du traitement</h2>
            <div className="text-muted-foreground space-y-2">
              <p>Vos données sont traitées aux fins suivantes :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Gestion et exécution de vos commandes (base légale : exécution du contrat).</li>
                <li>Gestion de votre compte client (base légale : exécution du contrat).</li>
                <li>Traitement de vos demandes de support et de contact (base légale : intérêt légitime).</li>
                <li>Envoi de communications transactionnelles liées à votre compte et vos commandes (base légale : exécution du contrat).</li>
                <li>Amélioration de nos services et analyses statistiques anonymisées (base légale : intérêt légitime).</li>
                <li>Respect de nos obligations légales et comptables (base légale : obligation légale).</li>
              </ul>
            </div>
          </section>

          <section aria-labelledby="pc-duree">
            <h2 id="pc-duree" className="text-xl font-semibold mb-2">4. Durée de conservation</h2>
            <ul className="text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>Données de compte</strong> : conservées tant que le compte est actif + 3 ans après la dernière connexion.</li>
              <li><strong>Données de commandes</strong> : 10 ans (obligations comptables légales).</li>
              <li><strong>Messages de contact</strong> : 3 ans à compter de la réception.</li>
              <li><strong>Logs de navigation</strong> : 12 mois maximum.</li>
            </ul>
          </section>

          <section aria-labelledby="pc-destinataires">
            <h2 id="pc-destinataires" className="text-xl font-semibold mb-2">5. Destinataires des données</h2>
            <p className="text-muted-foreground">
              Vos données ne sont jamais vendues à des tiers. Elles peuvent être transmises à
              nos sous-traitants techniques dans le strict cadre de l'exécution de leurs missions :
            </p>
            <ul className="text-muted-foreground list-disc list-inside space-y-1 mt-2">
              <li><strong>Vercel</strong> (hébergement frontend) — USA, couvert par le Privacy Shield.</li>
              <li><strong>Render</strong> (hébergement backend) — USA, couvert par les clauses contractuelles types.</li>
              <li><strong>Stripe</strong> (paiement) — USA, couvert par les clauses contractuelles types.</li>
              <li><strong>Resend</strong> (emails transactionnels) — USA, couvert par les clauses contractuelles types.</li>
            </ul>
          </section>

          <section aria-labelledby="pc-droits">
            <h2 id="pc-droits" className="text-xl font-semibold mb-2">6. Vos droits</h2>
            <p className="text-muted-foreground mb-2">
              Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :
            </p>
            <ul className="text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>Droit d'accès</strong> (art. 15) : obtenir une copie des données vous concernant.</li>
              <li><strong>Droit de rectification</strong> (art. 16) : corriger des données inexactes ou incomplètes.</li>
              <li><strong>Droit à l'effacement</strong> (art. 17) : demander la suppression de vos données.</li>
              <li><strong>Droit à la limitation du traitement</strong> (art. 18) : suspendre l'utilisation de vos données.</li>
              <li><strong>Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format lisible par machine.</li>
              <li><strong>Droit d'opposition</strong> (art. 21) : vous opposer à un traitement basé sur l'intérêt légitime.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Pour exercer vos droits, contactez-nous à{' '}
              <a href="mailto:contact@althea-system.fr" className="text-althea-cta underline">contact@althea-system.fr</a>.
              Nous nous engageons à répondre dans un délai d'un mois. En cas de réponse insatisfaisante,
              vous pouvez saisir la{' '}
              <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) —{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-althea-cta underline">cnil.fr</a>.
            </p>
          </section>

          <section aria-labelledby="pc-securite">
            <h2 id="pc-securite" className="text-xl font-semibold mb-2">7. Sécurité</h2>
            <p className="text-muted-foreground">
              Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour
              protéger vos données contre tout accès non autorisé, perte, altération ou divulgation :
              chiffrement HTTPS (TLS 1.3), mots de passe hachés (bcrypt), tokens JWT à durée de vie
              limitée, protection CSRF sur les formulaires, isolation des données par environnement.
            </p>
          </section>

          <section aria-labelledby="pc-cookies">
            <h2 id="pc-cookies" className="text-xl font-semibold mb-2">8. Cookies</h2>
            <p className="text-muted-foreground">
              Nous utilisons uniquement des cookies techniques strictement nécessaires :
            </p>
            <ul className="text-muted-foreground list-disc list-inside space-y-1 mt-2">
              <li><strong>Cookie d'authentification</strong> (JWT) : maintien de la session utilisateur. Durée : 7 jours.</li>
              <li><strong>Cookie de panier</strong> : conservation du panier entre les sessions. Durée : session.</li>
              <li><strong>Cookie de langue</strong> : mémorisation de la préférence linguistique. Durée : 1 an.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Aucun cookie publicitaire, de tracking ou analytique tiers n'est utilisé.
            </p>
          </section>

          <section aria-labelledby="pc-modification">
            <h2 id="pc-modification" className="text-xl font-semibold mb-2">9. Modifications de cette politique</h2>
            <p className="text-muted-foreground">
              Althea System se réserve le droit de modifier la présente politique à tout moment.
              Toute modification substantielle sera communiquée aux utilisateurs par email ou par
              une notification sur le site. La date de mise à jour est indiquée en haut de cette page.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
