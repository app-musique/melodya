"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const items = [
  {
    q: "Puis-je citer des prénoms et des souvenirs précis ?",
    a: "Oui, c'est tout l'intérêt. Tu nous donnes les prénoms, les anecdotes, les dates, les surnoms… et l'IA les intègre naturellement dans les paroles. Tu relis et valides le texte avant la composition.",
  },
  {
    q: "Pour quelles occasions puis-je commander ?",
    a: "Anniversaire, mariage, dot, fiançailles, baptême, naissance, hommage, réussite à un examen, départ en retraite, fête des mères ou des pères, déclaration d'amour, demande de pardon… Si c'est un moment qui compte, on en fait une chanson.",
  },
  {
    q: "Puis-je choisir le style musical et la voix ?",
    a: "Oui. Afrobeat, Amapiano, Coupé-décalé, Rumba, Gospel, Zouk, Highlife, RnB, acoustique… Tu choisis aussi la voix : homme, femme, enfant ou duo, et l'ambiance (festive, émouvante, douce).",
  },
  {
    q: "Combien de versions je reçois ?",
    a: "Tu reçois 2 versions différentes de ta chanson. Tu écoutes, tu choisis ta préférée, et on te livre le fichier en haute qualité. Une régénération est offerte si aucune ne te convient.",
  },
  {
    q: "Comment et en combien de temps je reçois ma chanson ?",
    a: "Ta chanson est prête en quelques minutes. Tu la retrouves dans ton espace personnel et tu reçois un email quand elle est disponible : MP3 haute qualité, pochette et 2 versions au choix, le tout téléchargeable.",
  },
  {
    q: "Comment ça marche, les crédits ?",
    a: "Tu achètes un pack de crédits (paiement unique) et 1 chanson = 1 crédit. Tes crédits n'expirent jamais et tu peux les utiliser quand tu veux, pour autant de chansons que tu veux.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Le paiement est géré de façon sécurisée par Moneroo : Orange Money, MTN Mobile Money, Moov Money, Wave, M-Pesa, Airtel Money et carte bancaire, dans la plupart des pays d'Afrique.",
  },
  {
    q: "Puis-je demander des modifications ?",
    a: "Oui. Tu ajustes les paroles librement avant la composition, et si le résultat ne te convient pas tu peux relancer une génération (1 offerte).",
  },
  {
    q: "À qui appartient la chanson ?",
    a: "Elle est à toi. Tu peux l'offrir, la diffuser lors de ton événement et la partager avec tes proches. Muzikii ne revend pas les chansons créées par les utilisateurs.",
  },
];

export function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-3xl border border-line bg-white">
      {items.map((it, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={it.q} className="px-6">
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-display text-base font-semibold sm:text-lg">{it.q}</span>
              <Plus
                className={`size-5 shrink-0 text-brand-strong transition-transform ${
                  isOpen ? "rotate-45" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ${
                isOpen ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"
              }`}
            >
              <p className="overflow-hidden text-sm leading-relaxed text-ink-soft">{it.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
