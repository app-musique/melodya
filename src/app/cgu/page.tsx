import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions générales d'utilisation et de vente du service Muzikii.",
};

export default function CguPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation et de vente" updated="29 août 2026">
      <p>
        Les présentes conditions (les « Conditions ») régissent l&apos;accès et l&apos;utilisation
        du service Muzikii, accessible sur muzikii.com (le « Service »). En créant un compte ou en
        utilisant le Service, tu acceptes ces Conditions.
      </p>

      <h2>1. Éditeur</h2>
      <p>
        Le Service est édité par <strong>[Raison sociale à compléter]</strong>, [forme juridique],
        [n° d&apos;immatriculation / RCCM], dont le siège est situé [adresse]. Directeur de la
        publication : [nom]. Contact : <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>

      <h2>2. Description du Service</h2>
      <p>
        Muzikii permet de créer une chanson personnalisée à partir d&apos;informations que tu
        fournis (occasion, prénoms, anecdotes, style, voix). Les paroles sont rédigées par un
        modèle d&apos;intelligence artificielle puis éditables par toi ; la musique est composée
        par un service de génération musicale tiers. Le Service fournit un ou plusieurs fichiers
        audio, une pochette et une page de partage.
      </p>

      <h2>3. Compte</h2>
      <ul>
        <li>La création d&apos;un compte requiert une adresse email valide (ou une connexion Google).</li>
        <li>Tu es responsable de la confidentialité de tes identifiants et des actions réalisées depuis ton compte.</li>
        <li>Le Service est réservé aux personnes de 18 ans ou plus, ou aux mineurs avec l&apos;accord de leur représentant légal.</li>
        <li>Un compte est personnel. Les informations fournies doivent être exactes.</li>
      </ul>

      <h2>4. Crédits, prix et paiement</h2>
      <ul>
        <li>L&apos;utilisation du Service repose sur des <strong>crédits</strong> achetés par packs. La création d&apos;une chanson consomme le nombre de crédits indiqué au moment de la commande (par défaut 1).</li>
        <li>Il ne s&apos;agit pas d&apos;un abonnement. Les crédits n&apos;expirent pas.</li>
        <li>Les prix sont indiqués en francs CFA (XOF), toutes taxes éventuelles comprises. Ils peuvent être modifiés à tout moment ; le prix applicable est celui affiché au moment de l&apos;achat.</li>
        <li>Le paiement est traité par <strong>Moneroo</strong> (et ses partenaires PayDunya / pawaPay) : Mobile Money et carte bancaire. Muzikii ne stocke aucune donnée de carte ni de compte Mobile Money.</li>
        <li>Un crédit débité pour une génération qui échoue pour une raison technique et qui n&apos;aboutit pas après une nouvelle tentative est automatiquement recrédité.</li>
        <li>En raison de la nature immatérielle et immédiate du Service, un crédit consommé pour une chanson livrée n&apos;est pas remboursable, sauf disposition légale impérative contraire.</li>
      </ul>

      <h2>5. Contenu que tu fournis</h2>
      <p>
        Tu restes responsable des informations que tu saisis (histoire, prénoms, détails). Tu
        garantis avoir le droit de les utiliser et, le cas échéant, de mentionner des tiers. Tu
        t&apos;interdis de soumettre un contenu illégal, diffamatoire, haineux, portant atteinte
        à la vie privée ou aux droits d&apos;un tiers. Muzikii peut refuser, suspendre ou
        supprimer une création ou un compte en cas de manquement.
      </p>

      <h2>6. Ta chanson</h2>
      <ul>
        <li>Une fois la chanson générée et le crédit consommé, tu disposes d&apos;un droit d&apos;usage large : usage personnel, offrir la chanson, la diffuser lors de ton événement, la partager avec tes proches.</li>
        <li>Pour un usage commercial (monétisation, publicité, distribution sur plateformes), les conditions du fournisseur de génération musicale s&apos;appliquent en complément ; renseigne-toi avant un tel usage.</li>
        <li>Muzikii ne revend pas les chansons créées par les utilisateurs.</li>
        <li>Si tu rends une création publique (page cadeau, galerie « Explorer »), tu autorises Muzikii à l&apos;afficher dans le Service à des fins d&apos;illustration, tant qu&apos;elle reste publique.</li>
      </ul>

      <h2>7. Génération par IA</h2>
      <p>
        Les résultats sont générés automatiquement et varient d&apos;une génération à l&apos;autre.
        Muzikii ne garantit pas un résultat conforme à une attente subjective précise. Une
        régénération est offerte par chanson. Les créations s&apos;inspirent de styles musicaux
        sans reproduire d&apos;œuvre existante ; si tu constates une similitude problématique,
        signale-le à <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>

      <h2>8. Disponibilité</h2>
      <p>
        Muzikii s&apos;efforce d&apos;assurer la disponibilité du Service mais ne garantit pas une
        absence totale d&apos;interruption. Le Service peut évoluer, être suspendu pour maintenance
        ou modifié.
      </p>

      <h2>9. Responsabilité</h2>
      <p>
        Le Service est fourni « en l&apos;état ». Dans la limite permise par la loi, la
        responsabilité de Muzikii est limitée au montant payé par l&apos;utilisateur au cours des
        douze derniers mois. Muzikii n&apos;est pas responsable des défaillances de ses
        prestataires tiers (génération musicale, IA de paroles, paiement, hébergement, email), ni
        des cas de force majeure.
      </p>

      <h2>10. Résiliation</h2>
      <p>
        Tu peux cesser d&apos;utiliser le Service et demander la suppression de ton compte à tout
        moment en écrivant à <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. Les
        crédits non utilisés sont perdus à la suppression du compte. Muzikii peut résilier un
        compte en cas de manquement aux Conditions.
      </p>

      <h2>11. Données personnelles</h2>
      <p>
        Le traitement de tes données est décrit dans la{" "}
        <a href="/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2>12. Droit applicable</h2>
      <p>
        Les présentes Conditions sont soumises au droit [pays à compléter]. En cas de litige, une
        solution amiable sera recherchée avant toute action ; à défaut, les tribunaux compétents
        seront ceux du ressort du siège de l&apos;éditeur, sous réserve des règles protectrices du
        consommateur.
      </p>

      <h2>13. Contact</h2>
      <p>
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
      </p>
    </LegalPage>
  );
}
