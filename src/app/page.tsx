import {
  ArrowRight,
  Check,
  Clock,
  Image as ImageIcon,
  Mic,
  PenLine,
  Play,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wand2,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { HeroFloaties } from "@/components/hero-floaties";
import { Faq } from "@/components/faq";
import { ExampleCard, type Example } from "@/components/example-card";
import { Logo } from "@/components/logo";
import { navLinks, occasions, orderHref, paymentMethods } from "@/lib/site";

const steps = [
  {
    icon: PenLine,
    title: "Raconte ton histoire",
    text: "Occasion, prénoms, anecdotes, style et voix : réponds à quelques questions guidées, en 3 minutes.",
  },
  {
    icon: Wand2,
    title: "L'IA écrit les paroles",
    text: "Un texte sur-mesure est rédigé à partir de ton histoire. Tu le relis et tu l'ajustes librement.",
  },
  {
    icon: Mic,
    title: "On compose 3 versions",
    text: "Notre studio IA compose ta chanson dans le style choisi. Tu écoutes et tu gardes ta préférée.",
  },
  {
    icon: Sparkles,
    title: "Reçois ta chanson",
    text: "Prête en 24h dans ton espace personnel : MP3, pochette et clip lyrics à télécharger. Express 6h dispo.",
  },
];

const valueProps = [
  {
    icon: PenLine,
    title: "Paroles écrites ET éditables",
    text: "Tu n'es pas prisonnier d'un prompt. Le texte est généré puis modifiable ligne par ligne avant la compo.",
  },
  {
    icon: Mic,
    title: "Voix et accent au choix",
    text: "Homme, femme, enfant ou duo. Accent local ou neutre. Ambiance festive, douce ou émouvante.",
  },
  {
    icon: Sparkles,
    title: "3 versions, pas une seule",
    text: "Tu compares, tu choisis. Une régénération offerte si aucune ne te convient.",
  },
  {
    icon: ImageIcon,
    title: "Pochette + clip lyrics offerts",
    text: "Une pochette générée à ton nom et une vidéo paroles prête à partager sur les réseaux.",
  },
  {
    icon: QrCode,
    title: "Page cadeau avec QR code",
    text: "Une mini-page dédiée : dédicace, photos, compte à rebours. Partage le lien ou le QR le jour J.",
  },
  {
    icon: Users,
    title: "Chanson collaborative",
    text: "Plusieurs proches ajoutent leur message via un lien. On les réunit dans une seule chanson.",
  },
];

const examples: Example[] = [
  {
    title: "Joyeux anniversaire Sarah",
    subtitle: "Pour ma sœur",
    style: "Amapiano",
    tags: ["Anniversaire", "Fête"],
    from: "#8a5a2b",
    to: "#e5a44c",
  },
  {
    title: "Pour ma femme Christelle",
    subtitle: "10 ans de mariage",
    style: "Afrobeat",
    tags: ["Amour", "Mariage"],
    from: "#5b1e46",
    to: "#c0567e",
  },
  {
    title: "Hommage à Papa Kof",
    subtitle: "En sa mémoire",
    style: "Acoustique",
    tags: ["Hommage", "Souvenir"],
    from: "#3a3a3a",
    to: "#8d8d8d",
  },
  {
    title: "Bravo Adama",
    subtitle: "Diplôme obtenu",
    style: "Coupé-décalé",
    tags: ["Réussite", "Diplôme"],
    from: "#1c5b4a",
    to: "#4fb98f",
  },
];

const included = [
  "Paroles personnalisées écrites par l'IA + relecture éditable",
  "3 versions au choix dans le style et la voix que tu veux",
  "Fichier MP3 haute qualité",
  "Pochette générée à ton nom",
  "Page cadeau avec QR code à partager",
  "Chanson prête en 24h dans ton espace personnel",
  "1 régénération offerte si tu n'es pas satisfait",
];

const addons = [
  { name: "Clip vidéo lyrics", price: "+ 3 000 F" },
  { name: "Livraison express 6h", price: "+ 2 000 F" },
  { name: "Version instrumentale (karaoké)", price: "+ 1 500 F" },
  { name: "Fichier WAV studio", price: "+ 2 500 F" },
];

const testimonials = [
  {
    quote:
      "J'ai commandé pour l'entrée de mariage de ma sœur. Tout le monde a pleuré. Prête en une nuit.",
    name: "Aminata D.",
    role: "Mariage · Abidjan",
  },
  {
    quote:
      "Pour les 60 ans de mon père on a fait une chanson Rumba qui raconte sa vie. Le meilleur cadeau de la soirée.",
    name: "Serge M.",
    role: "Anniversaire · Kinshasa",
  },
  {
    quote:
      "Paiement Orange Money, texte modifié deux fois, voix d'enfant pour la fête des mères. Simple et vraiment émouvant.",
    name: "Rita K.",
    role: "Fête des mères · Lomé",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top" className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-40 -top-40 size-[38rem] rounded-full bg-brand/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 top-40 size-[30rem] rounded-full bg-gold/15 blur-3xl" />
          <HeroFloaties />

          <div className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold text-brand-strong">
                <span className="size-1.5 rounded-full bg-brand-strong" />
                N°1 de la chanson personnalisée par IA en Afrique
              </span>

              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Transforme tes mots
                <br />
                en <span className="text-gradient-brand">chanson inoubliable</span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
                Anniversaire, mariage, dot, hommage… Raconte ton histoire, notre IA écrit les
                paroles et compose ta chanson sur-mesure. Prête à télécharger en 24h.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={orderHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full gradient-brand px-7 py-4 font-semibold text-white shadow-[var(--shadow-float)] transition-transform hover:-translate-y-0.5 sm:w-auto"
                >
                  Créer ma chanson
                  <ArrowRight className="size-4" />
                </a>
                <a
                  href="#exemples"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-7 py-4 font-semibold transition-colors hover:bg-ink/5 sm:w-auto"
                >
                  <Play className="size-4" />
                  Écouter des exemples
                </a>
              </div>

              <div className="mt-8 flex flex-col items-center gap-2">
                <div className="flex items-center gap-1 text-gold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold text-ink">185 512</span> chansons créées pour des
                  moments qui comptent
                </p>
              </div>

              <div className="mt-8">
                <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-soft">
                  <ShieldCheck className="size-3.5 text-brand-strong" />
                  Paiement sécurisé via Moneroo
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  {paymentMethods.map((m) => (
                    <span key={m} className="text-xs font-medium text-ink-soft/80">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Occasions marquee */}
          <div className="relative z-10 border-y border-line bg-white/60 py-4">
            <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
              <ul className="flex shrink-0 animate-[marquee_38s_linear_infinite] items-center gap-8 pr-8">
                {[...occasions, ...occasions].map((o, i) => (
                  <li
                    key={`${o}-${i}`}
                    className="flex items-center gap-2 whitespace-nowrap font-display text-sm font-semibold uppercase tracking-wide text-ink-soft"
                  >
                    <Sparkles className="size-3.5 text-brand" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* STEPS */}
        <section id="etapes" className="section-pad">
          <div className="mx-auto max-w-6xl px-5">
            <header className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                De ton histoire à ta chanson, en 4 étapes
              </h2>
              <p className="mt-3 text-ink-soft">
                Pas de studio, pas de compétence musicale. Juste ce que tu as à dire.
              </p>
            </header>

            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li
                  key={s.title}
                  className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-cream-deep text-brand-strong">
                      <s.icon className="size-5" />
                    </span>
                    <span className="font-display text-sm font-bold text-line">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* VALUE PROPS */}
        <section className="section-pad bg-plum text-cream">
          <div className="mx-auto max-w-6xl px-5">
            <header className="max-w-2xl">
              <span className="text-sm font-semibold uppercase tracking-widest text-gold">
                Plus qu&apos;une chanson
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ce que les autres ne font pas
              </h2>
              <p className="mt-3 text-cream/70">
                On ne se contente pas d&apos;envoyer un MP3. On te livre un cadeau complet, prêt à
                offrir.
              </p>
            </header>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {valueProps.map((v) => (
                <div
                  key={v.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                >
                  <v.icon className="size-6 text-gold" />
                  <h3 className="mt-4 font-display text-lg font-bold">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/70">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EXAMPLES */}
        <section id="exemples" className="section-pad">
          <div className="mx-auto max-w-6xl px-5">
            <header className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ils l&apos;ont créée avec Melodya
              </h2>
              <p className="mt-3 text-ink-soft">
                Des chansons pensées pour un seul moment, une seule personne.
              </p>
            </header>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {examples.map((ex) => (
                <ExampleCard key={ex.title} ex={ex} />
              ))}
            </div>
          </div>
        </section>

        {/* OFFER */}
        <section id="offre" className="section-pad bg-cream-deep">
          <div className="mx-auto max-w-6xl px-5">
            <header className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Un prix unique, tout compris
              </h2>
              <p className="mt-3 text-ink-soft">
                Pas d&apos;abonnement. Tu paies ta chanson, une seule fois.
              </p>
            </header>

            <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-3xl border border-line bg-white p-8 shadow-[var(--shadow-soft)]">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold">9 900 F</span>
                  <span className="text-ink-soft">CFA · ~15 €</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">Chanson personnalisée complète</p>

                <ul className="mt-6 space-y-3">
                  {included.map((f) => (
                    <li key={f} className="flex gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-strong" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={orderHref}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full gradient-brand px-7 py-4 font-semibold text-white shadow-[var(--shadow-float)] transition-transform hover:-translate-y-0.5"
                >
                  Commencer ma chanson
                  <ArrowRight className="size-4" />
                </a>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-soft">
                  <Clock className="size-3.5" /> Chanson prête sous 24h garanti
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-3xl border border-line bg-white p-8">
                  <h3 className="font-display text-lg font-bold">Options en plus</h3>
                  <p className="mt-1 text-sm text-ink-soft">À ajouter au moment de la commande.</p>
                  <ul className="mt-6 divide-y divide-line">
                    {addons.map((a) => (
                      <li
                        key={a.name}
                        className="flex items-center justify-between gap-4 py-3 text-sm"
                      >
                        <span>{a.name}</span>
                        <span className="font-semibold text-brand-strong">{a.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-line bg-white p-6">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="size-4 text-brand-strong" />
                    Paiement sécurisé via Moneroo
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Orange Money, MTN MoMo, Moov Money, Wave, M-Pesa, Airtel Money et carte
                    bancaire. Transaction chiffrée, aucun frais caché.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="section-pad">
          <div className="mx-auto max-w-6xl px-5">
            <header className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ils ont marqué l&apos;occasion
              </h2>
            </header>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure
                  key={t.name}
                  className="flex flex-col rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-brand-strong">{t.role}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-pad pt-0">
          <div className="mx-auto max-w-6xl px-5">
            <div className="relative overflow-hidden rounded-[2rem] gradient-brand px-8 py-14 text-center text-white">
              <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/15 blur-2xl" />
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Une personne, un moment, une chanson.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-white/85">
                Commence maintenant, ta chanson est prête en 24h. Paiement Mobile Money ou carte.
              </p>
              <a
                href={orderHref}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-brand-strong transition-transform hover:-translate-y-0.5"
              >
                Créer ma chanson
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="section-pad pt-0">
          <div className="mx-auto max-w-6xl px-5">
            <header className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Questions fréquentes
              </h2>
              <p className="mt-3 text-ink-soft">
                Tout ce qu&apos;il faut savoir avant de commander.
              </p>
            </header>
            <div className="mt-12">
              <Faq />
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-ink-soft">
              La chanson personnalisée par IA, pensée pour l&apos;Afrique. Paiement Mobile Money,
              livraison en ligne.
            </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-ink-soft hover:text-ink">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-2 text-sm">
            <a href="#" className="text-ink-soft hover:text-ink">
              Politique de confidentialité
            </a>
            <a href="#" className="text-ink-soft hover:text-ink">
              Conditions d&apos;utilisation
            </a>
            <a href="#" className="text-ink-soft hover:text-ink">
              contact@melodya.app
            </a>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 text-xs text-ink-soft sm:flex-row">
            <span>© 2026 Melodya. Tous droits réservés.</span>
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              {paymentMethods.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
