/**
 * Gabarits d'emails transactionnels — fonctions pures renvoyant { subject, html, text }.
 * HTML inline-styled (compat clients mail), palette Melodya. Nom « Melodya » = placeholder.
 */

const PLUM = "#3b1d4e";
const INK = "#2a1c33";
const SOFT = "#6b5b76";

type Mail = { subject: string; html: string; text: string };

function shell(opts: {
  preview: string;
  heading: string;
  intro: string;
  ctaLabel?: string;
  ctaHref?: string;
  outro?: string;
}): string {
  const button =
    opts.ctaLabel && opts.ctaHref
      ? `<tr><td style="padding:8px 0 4px">
           <a href="${opts.ctaHref}" style="display:inline-block;background:${PLUM};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px">${opts.ctaLabel}</a>
         </td></tr>`
      : "";
  const outro = opts.outro
    ? `<tr><td style="padding:14px 0 0;color:${SOFT};font-size:13px;line-height:1.6">${opts.outro}</td></tr>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f6f1ec;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${opts.preview}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ec;padding:28px 16px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ece3ee">
      <tr><td style="background:${PLUM};padding:20px 28px">
        <span style="color:#fff;font-size:19px;font-weight:800;letter-spacing:-0.3px">Melodya</span>
      </td></tr>
      <tr><td style="padding:28px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:21px;font-weight:800;color:${INK};line-height:1.3;padding-bottom:10px">${opts.heading}</td></tr>
          <tr><td style="font-size:15px;color:${INK};line-height:1.65;padding-bottom:18px">${opts.intro}</td></tr>
          ${button}
          ${outro}
        </table>
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #ece3ee;color:${SOFT};font-size:12px;line-height:1.6">
        Melodya — ta chanson personnalisée par IA.<br>
        Tu reçois cet email suite à ton activité sur Melodya. Gère tes alertes dans ton profil › Réglages.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const hi = (name: string) => (name ? `Salut ${name},` : "Salut,");

export function welcomeTpl(o: { name: string; siteUrl: string }): Mail {
  return {
    subject: "Bienvenue sur Melodya 🎶",
    html: shell({
      preview: "Ton premier crédit t'attend.",
      heading: "Bienvenue !",
      intro: `${hi(o.name)} ton compte est prêt et un crédit t'attend. Une occasion, une histoire, un style — et Melodya compose une chanson personnalisée en quelques minutes.`,
      ctaLabel: "Créer ma première chanson",
      ctaHref: `${o.siteUrl}/commander`,
      outro: "Astuce : ajoute les anniversaires à ne pas oublier dans ton carnet d'occasions, on te préviendra à l'avance.",
    }),
    text: `${hi(o.name)} bienvenue sur Melodya. Un crédit t'attend : ${o.siteUrl}/commander`,
  };
}

export function songReadyTpl(o: {
  name: string;
  recipientName: string;
  songId: string;
  siteUrl: string;
}): Mail {
  return {
    subject: `Ta chanson pour ${o.recipientName || "un proche"} est prête 🎉`,
    html: shell({
      preview: "Écoute les versions et choisis ta préférée.",
      heading: "Ta chanson est prête 🎉",
      intro: `${hi(o.name)} la chanson pour <strong>${o.recipientName || "ton proche"}</strong> vient de sortir du studio. Écoute les versions, choisis ta préférée, puis active la page cadeau.`,
      ctaLabel: "Écouter ma chanson",
      ctaHref: `${o.siteUrl}/mes-chansons/${o.songId}`,
    }),
    text: `${hi(o.name)} ta chanson pour ${o.recipientName || "ton proche"} est prête : ${o.siteUrl}/mes-chansons/${o.songId}`,
  };
}

export function giftReactionTpl(o: {
  name: string;
  authorName: string;
  emoji: string;
  message: string | null;
  songId: string;
  siteUrl: string;
}): Mail {
  const who = o.authorName || "Quelqu'un";
  const quote = o.message
    ? `<div style="margin-top:12px;padding:12px 16px;background:#f6f1ec;border-radius:12px;font-style:italic;color:${INK}">« ${o.message} »</div>`
    : "";
  return {
    subject: `${who} a réagi à ton cadeau ${o.emoji}`,
    html: shell({
      preview: `${who} a laissé un mot sur ta page cadeau.`,
      heading: `${who} a réagi ${o.emoji}`,
      intro: `${hi(o.name)} ton cadeau touche sa cible. ${who} vient de laisser une réaction sur la page cadeau.${quote}`,
      ctaLabel: "Voir l'impact de mon cadeau",
      ctaHref: `${o.siteUrl}/mes-chansons/${o.songId}`,
    }),
    text: `${who} a réagi à ton cadeau ${o.emoji}${o.message ? ` : « ${o.message} »` : ""}. ${o.siteUrl}/mes-chansons/${o.songId}`,
  };
}

export function occasionReminderTpl(o: {
  name: string;
  label: string;
  personName: string | null;
  daysUntil: number;
  link: string;
  siteUrl: string;
}): Mail {
  const who = o.personName ? ` de ${o.personName}` : "";
  const when =
    o.daysUntil === 0
      ? "c'est aujourd'hui"
      : `c'est dans ${o.daysUntil} jour${o.daysUntil > 1 ? "s" : ""}`;
  return {
    subject: `${o.label}${who} — ${when}`,
    html: shell({
      preview: "Il est encore temps de créer une chanson.",
      heading: `${o.label}${who}`,
      intro: `${hi(o.name)} ${when}. Prends de l'avance : une chanson personnalisée se prépare en quelques minutes et fait toujours son effet le jour J.`,
      ctaLabel: "Créer une chanson",
      ctaHref: `${o.siteUrl}${o.link}`,
    }),
    text: `${o.label}${who} : ${when}. Crée une chanson : ${o.siteUrl}${o.link}`,
  };
}
