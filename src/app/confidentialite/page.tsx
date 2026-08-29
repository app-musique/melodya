import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Muzikii collecte et traite tes données personnelles.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="29 août 2026">
      <p>
        Cette politique explique quelles données Muzikii collecte, pourquoi, avec qui elles sont
        partagées et quels sont tes droits.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>[Raison sociale à compléter]</strong>, [adresse]. Contact pour toute question
        relative à tes données : <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><strong>Compte :</strong> adresse email, prénom, mot de passe (stocké sous forme chiffrée par notre prestataire d&apos;authentification), et si tu les renseignes : pays, numéro de téléphone.</li>
        <li><strong>Contenu de commande :</strong> occasion, prénom du destinataire, relation, l&apos;histoire et les anecdotes que tu saisis, style musical, voix, langue, et les paroles générées.</li>
        <li><strong>Paiement :</strong> le paiement est traité par Moneroo. Nous ne recevons ni ne stockons de numéro de carte ou de compte Mobile Money. Nous conservons le montant, la date, le statut et un identifiant de transaction.</li>
        <li><strong>Usage :</strong> chansons créées, réactions laissées sur les pages cadeau, notifications, dates d&apos;occasions que tu ajoutes, code et lien de parrainage.</li>
        <li><strong>Données techniques :</strong> adresse IP, type de navigateur, journaux d&apos;erreurs, cookies strictement nécessaires.</li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>Fournir le Service et livrer tes chansons — <em>exécution du contrat</em>.</li>
        <li>Traiter les paiements et tenir la comptabilité — <em>contrat et obligation légale</em>.</li>
        <li>Envoyer les emails liés à ton activité (chanson prête, réaction reçue, rappel d&apos;occasion, bienvenue) — <em>exécution du contrat</em> ; tu peux les désactiver dans Profil › Réglages.</li>
        <li>Sécuriser le Service, prévenir la fraude, améliorer le produit — <em>intérêt légitime</em>.</li>
      </ul>

      <h2>4. Destinataires et sous-traitants</h2>
      <p>Tes données sont traitées par des prestataires agissant pour notre compte :</p>
      <ul>
        <li><strong>Supabase</strong> — base de données et authentification.</li>
        <li><strong>Vercel</strong> — hébergement de l&apos;application.</li>
        <li><strong>Brevo</strong> — envoi des emails transactionnels.</li>
        <li><strong>Moneroo</strong> (et PayDunya / pawaPay) — traitement des paiements.</li>
        <li><strong>Anthropic</strong> — génération des paroles : le brief que tu saisis (occasion, prénoms, histoire, style) lui est transmis pour produire le texte.</li>
        <li><strong>Fournisseur de génération musicale</strong> (sunoapi.org / Suno) — les paroles et le style lui sont transmis pour composer la musique.</li>
        <li><strong>Google</strong> — uniquement si tu choisis « Continuer avec Google ».</li>
      </ul>
      <p>
        Certains de ces prestataires sont situés hors de ton pays, notamment aux États-Unis. Les
        transferts sont encadrés par les garanties contractuelles appropriées.
      </p>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li>Données de compte et chansons : tant que ton compte existe, puis supprimées ou anonymisées dans un délai raisonnable après la clôture du compte.</li>
        <li>Données de paiement et pièces comptables : selon les obligations légales applicables (généralement plusieurs années).</li>
        <li>Journaux techniques : quelques mois.</li>
      </ul>

      <h2>6. Tes droits</h2>
      <p>
        Tu disposes d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
        limitation, d&apos;opposition et de portabilité de tes données, ainsi que du droit de
        retirer ton consentement. Pour les exercer, écris à{" "}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. Tu peux aussi introduire
        une réclamation auprès de l&apos;autorité de protection des données compétente de ton pays.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Muzikii n&apos;utilise que des cookies strictement nécessaires : session de connexion,
        mémorisation d&apos;un lien de parrainage, préférence d&apos;affichage. Aucun cookie
        publicitaire ni traceur tiers à des fins de profilage.
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables (chiffrement
        des mots de passe, accès restreints, hébergement sécurisé) pour protéger tes données.
        Aucune transmission sur Internet n&apos;est toutefois totalement infaillible.
      </p>

      <h2>9. Mineurs</h2>
      <p>
        Le Service n&apos;est pas destiné aux personnes de moins de 18 ans sans l&apos;accord de
        leur représentant légal.
      </p>

      <h2>10. Modifications</h2>
      <p>
        Cette politique peut être mise à jour. La date en haut de page indique la dernière version.
      </p>

      <h2>11. Contact</h2>
      <p>
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
      </p>
    </LegalPage>
  );
}
