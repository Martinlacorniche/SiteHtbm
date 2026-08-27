// src/app/cgv/page.tsx
//
// ⚠️ CETTE PAGE EST UN DOCUMENT CONTRACTUEL, PAS UNE PAGE DE MARKETING.
// C'est elle que Mews doit pointer dans `TermsAndConditionsUrl` — au 27/08/2026
// ce champ vaut encore `https://www.hotel-voiles.com/fr/#`, une ancre vide sur
// un domaine qui n'est plus le site canonique. Tant qu'il pointe dans le vide,
// vendre une nuit en ligne à un consommateur français se fait sans conditions
// opposables.
//
// ⚠️ LES RÈGLES ÉCRITES ICI SONT CELLES DE MEWS, RELEVÉES LE 27/08/2026 SUR LA
// PRODUCTION — pas des formules recopiées d'un modèle :
//   · Flexible : « Annulable sans frais jusqu'au jour d'arrivée 18h »,
//     groupe tarifaire `CreatePreauthorization`, `SettlementValue: 0.01`.
//   · Prépayé  : « Tarif non annulable non remboursable. Prépaiement à la
//     réservation de 100% des nuitées, hors extras. »,
//     groupe tarifaire `ChargeCreditCard`, `SettlementValue: 1`.
// Si un tarif change dans Mews, CETTE PAGE DOIT CHANGER AVEC LUI. Deux textes
// qui divergent, c'est le client qui a raison contre l'hôtel.
//
// ⚠️ LE VENDEUR N'EST PAS L'ÉDITEUR DU SITE, ET LA DISTINCTION EST JURIDIQUE.
// Le site `hotels-toulon-mer.com` porte deux hôtels et est édité par la SARL
// SUERE (voir `/mentions`). Mais celle qui vend la nuit aux Voiles, encaisse et
// répond au client, c'est la **SAS LES VOILES** — entité distincte, confirmée
// par Martin le 27/08/2026 sur les registres INSEE et INPI. Des CGV qui
// désigneraient la SARL comme vendeur seraient opposables à la mauvaise
// société. Ne pas « harmoniser » ces deux pages.
//
// ⚠️ DEUX TROUS RESTENT, marqués À COMPLÉTER dans le texte : le médiateur de la
// consommation (adhésion obligatoire, art. L612-1 du code de la consommation)
// et l'assurance annulation.

import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { alternatesFor } from "@/lib/site";

export const metadata: Metadata = {
  alternates: alternatesFor("/cgv"),
  title: "Conditions générales de vente — Hôtel-Rooftop Les Voiles, Toulon",
  description:
    "Conditions générales de vente des séjours réservés en direct à l'Hôtel-Rooftop Les Voiles : prix, paiement, annulation, arrivée et départ.",
};

/* Une seule date de mise à jour, en haut et en bas. Écrite à la main : elle doit
   bouger quand le TEXTE bouge, pas quand le site se redéploie. */
const MAJ = "27 août 2026";

function Section({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl text-slate-900 mb-4">{n}. {titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/* Ce qui reste à faire remplir. Visible, et pas en gris pâle : un trou qu'on ne
   voit pas est un trou qui part en production. */
function ACompleter({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-amber-100 px-1 font-semibold text-amber-900">
      [À COMPLÉTER — {children}]
    </mark>
  );
}

export default function CGV() {
  return (
    <div className="min-h-screen bg-cream p-6 font-sans text-slate-900 md:p-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;accueil
        </Link>

        <h1 className="mb-2 font-serif text-4xl md:text-5xl">Conditions générales de vente</h1>
        <p className="mb-10 text-sm text-slate-500">
          Hôtel-Rooftop Les Voiles — Toulon Mourillon · Version du {MAJ}
        </p>

        <div className="space-y-10 leading-relaxed text-slate-600">

          <Section n={1} titre="Objet">
            <p>
              Les présentes conditions générales de vente régissent les réservations
              de nuitées effectuées <strong>en direct</strong> auprès de l&apos;Hôtel-Rooftop
              Les Voiles, sur le site <strong>hotels-toulon-mer.com</strong>, par téléphone ou
              par courriel.
            </p>
            <p>
              Elles ne s&apos;appliquent pas aux réservations effectuées par
              l&apos;intermédiaire d&apos;une agence de voyage en ligne ou de tout autre
              distributeur, qui relèvent des conditions de ce distributeur.
            </p>
            <p>
              Toute réservation vaut acceptation sans réserve des présentes conditions.
              Elles sont portées à la connaissance du client avant qu&apos;il ne
              communique ses coordonnées bancaires, et restent accessibles à tout
              moment depuis cette adresse.
            </p>
          </Section>

          <Section n={2} titre="Identité du vendeur">
            <p>
              L&apos;Hôtel-Rooftop Les Voiles est situé au <strong>124 rue Gubler, 83000
              Toulon</strong>.<br />
              Téléphone : <a href="tel:+33494413623" className="underline">04 94 41 36 23</a><br />
              Courriel : <a href="mailto:contact@hotel-voiles.com" className="underline">contact@hotel-voiles.com</a>
            </p>
            <p>
              L&apos;hôtel est exploité, et les séjours sont vendus et encaissés, par
              la <strong>SAS LES VOILES</strong>, société par actions simplifiée.<br />
              Siège social : 124 rue Gubler, 83000 Toulon<br />
              SIREN : 795 063 304 — SIRET du siège : 795 063 304 00021<br />
              RCS Toulon 795 063 304<br />
              TVA intracommunautaire : FR82 795 063 304<br />
              Activité : hôtels et hébergement similaire (NAF 55.10Z)
            </p>
            <p>
              Le site <strong>hotels-toulon-mer.com</strong>, qui présente plusieurs
              établissements, est quant à lui édité par la <strong>SARL SUERE</strong> :
              voir les <Link href="/mentions" className="underline">mentions légales</Link>.
              L&apos;éditeur du site et le vendeur du séjour sont deux sociétés
              distinctes ; seule la SAS LES VOILES est partie au contrat
              d&apos;hébergement régi par les présentes conditions.
            </p>
          </Section>

          <Section n={3} titre="Prestations">
            <p>
              La réservation porte sur une chambre, pour un nombre de personnes et un
              nombre de nuits déterminés. <strong>Le petit-déjeuner est inclus</strong> dans
              les deux tarifs proposés en direct.
            </p>
            <p>
              Les photographies et descriptifs des chambres sont donnés à titre
              indicatif. L&apos;hôtel garantit la <em>catégorie</em> de chambre réservée,
              non une chambre déterminée : l&apos;attribution se fait à l&apos;arrivée.
            </p>
            <p>
              Les prestations facultatives — table au rooftop, consommations, services
              divers — ne sont pas comprises dans le prix de la nuitée et se règlent
              séparément, sauf mention contraire au moment de la réservation.
            </p>
          </Section>

          <Section n={4} titre="Prix">
            <p>
              Les prix sont indiqués en euros, <strong>toutes taxes comprises</strong>, et
              s&apos;entendent par chambre et pour la durée du séjour réservé.
            </p>
            <p>
              <strong>Le montant affiché comprend la taxe de séjour</strong>, au tarif en
              vigueur de <strong>1,86 € par adulte et par nuit</strong>. Le total présenté
              avant paiement est celui qui sera dû : l&apos;hôtel ne fait apparaître
              aucun supplément après coup.
            </p>
            <p>
              Les prix peuvent varier selon les dates et le remplissage. Le prix
              applicable est celui affiché au moment où la réservation est confirmée ;
              une variation ultérieure est sans effet sur une réservation déjà prise.
            </p>
            <p>
              Une modification du taux de la taxe de séjour décidée par
              l&apos;administration s&apos;applique de plein droit à la date de son entrée
              en vigueur, y compris aux réservations antérieures.
            </p>
          </Section>

          <Section n={5} titre="Formation de la réservation">
            <p>
              Le client choisit ses dates, sa chambre et son tarif, communique ses
              coordonnées, puis les données de sa carte bancaire. La réservation est
              <strong> définitivement formée</strong> lorsque l&apos;hôtel en confirme
              l&apos;enregistrement et communique un numéro de confirmation.
            </p>
            <p>
              Tant que ce numéro n&apos;a pas été communiqué, aucune chambre n&apos;est
              acquise. Une réservation entamée et non menée à son terme est libérée
              automatiquement dans un délai de vingt minutes.
            </p>
            <p>
              Le client est responsable de l&apos;exactitude des informations qu&apos;il
              communique, en particulier de son adresse électronique : c&apos;est à cette
              adresse que la confirmation est envoyée.
            </p>
          </Section>

          <Section n={6} titre="Paiement">
            <p>
              Une carte bancaire valide est exigée pour toute réservation. Les données
              de la carte sont saisies dans un cadre sécurisé fourni par le prestataire
              de paiement de l&apos;hôtel et <strong>ne transitent ni ne sont conservées par
              le site</strong>. L&apos;hôtel n&apos;a jamais accès au numéro complet de la
              carte.
            </p>
            <p>
              Les paiements sont traités par <strong>Mews Systems</strong>, prestataire de
              services de paiement de l&apos;hôtel, et sa solution de sécurisation des
              données bancaires. Une authentification forte du porteur peut être
              requise, conformément à la réglementation applicable aux services de
              paiement.
            </p>
            <p>
              Le traitement appliqué à la carte dépend du tarif retenu, et il est
              annoncé au client avant qu&apos;il ne valide :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Tarif flexible</strong> — la carte n&apos;est pas débitée à la
                réservation. Une <strong>empreinte bancaire</strong> garantit la chambre.
                Le séjour se règle à l&apos;hôtel, taxe de séjour comprise.
              </li>
              <li>
                <strong>Tarif prépayé</strong> — la <strong>totalité du séjour est débitée
                à la réservation</strong>. Ce tarif n&apos;est ni annulable ni remboursable
                (voir l&apos;article 7).
              </li>
            </ul>
            <p>
              En cas de rejet de la carte ou d&apos;échec de l&apos;authentification,
              la réservation n&apos;est pas formée et aucune chambre n&apos;est retenue.
            </p>
          </Section>

          <Section n={7} titre="Annulation et modification">
            <p>
              Les conditions dépendent du tarif retenu. Elles sont rappelées au client
              au moment du choix et sur sa confirmation.
            </p>
            <p>
              <strong>Tarif flexible</strong> — annulable sans frais
              <strong> jusqu&apos;au jour d&apos;arrivée à 18 h</strong> (heure de Paris).
              Passé ce délai, ou en cas de non-présentation, l&apos;hôtel se réserve le
              droit de facturer la <strong>première nuit</strong>, taxe de séjour comprise,
              sur la carte ayant servi à garantir la réservation.
            </p>
            <p>
              <strong>Tarif prépayé</strong> — <strong>non annulable et non
              remboursable</strong>, quelle que soit la date de l&apos;annulation et y
              compris en cas de non-présentation ou de départ anticipé. C&apos;est la
              contrepartie de son prix réduit.
            </p>
            <p>
              Toute demande d&apos;annulation ou de modification se fait par téléphone au
              04 94 41 36 23 ou par courriel à contact@hotel-voiles.com, en indiquant
              le numéro de confirmation. Une modification de dates ou de durée équivaut
              à une nouvelle réservation, au tarif alors disponible.
            </p>
            <p>
              <ACompleter>
                indiquer si une assurance annulation est proposée, et par quel assureur
              </ACompleter>
            </p>
          </Section>

          <Section n={8} titre="Absence de droit de rétractation">
            <p>
              Conformément à l&apos;<strong>article L221-28 du code de la consommation</strong>,
              le droit de rétractation ne s&apos;applique pas aux prestations
              d&apos;hébergement fournies à une date ou selon une périodicité déterminée.
            </p>
            <p>
              <strong>Le client ne dispose donc d&apos;aucun délai de rétractation de
              quatorze jours.</strong> Seules les conditions d&apos;annulation de son tarif,
              énoncées à l&apos;article 7, lui sont applicables.
            </p>
          </Section>

          <Section n={9} titre="Arrivée et départ">
            <p>
              Les chambres sont disponibles <strong>à partir de 15 h</strong> le jour de
              l&apos;arrivée. Une arrivée en autonomie est possible à partir de cette
              heure ; les modalités sont communiquées avant le séjour.
            </p>
            <p>
              Le départ s&apos;effectue <strong>au plus tard à 12 h</strong> le jour du
              départ pour toute réservation prise en direct. Un départ plus tardif peut
              être accordé selon les disponibilités et faire l&apos;objet d&apos;une
              facturation.
            </p>
            <p>
              Une pièce d&apos;identité est demandée à l&apos;arrivée, conformément à la
              réglementation applicable aux établissements d&apos;hébergement.
            </p>
          </Section>

          <Section n={10} titre="Comportement et responsabilité">
            <p>
              Le client s&apos;engage à user paisiblement de la chambre et des espaces
              communs. L&apos;hôtel se réserve le droit de mettre fin au séjour, sans
              remboursement, en cas de comportement contraire aux bonnes mœurs, à
              l&apos;ordre public ou de nature à troubler les autres clients.
            </p>
            <p>
              Les dégradations constatées dans la chambre ou les espaces communs sont
              facturées au client, sur justificatif.
            </p>
            <p>
              La responsabilité de l&apos;hôtel relative aux objets déposés par les
              clients s&apos;exerce dans les limites fixées par les
              <strong> articles 1952 à 1954 du code civil</strong>.
            </p>
          </Section>

          <Section n={11} titre="Données personnelles">
            <p>
              Les données communiquées lors de la réservation sont nécessaires à son
              exécution et à la facturation. Elles sont conservées pendant la durée
              requise par les obligations comptables et fiscales de l&apos;hôtel, puis
              supprimées.
            </p>
            <p>
              Conformément au règlement général sur la protection des données et à la
              loi « Informatique et Libertés », le client dispose d&apos;un droit
              d&apos;accès, de rectification, d&apos;effacement, de limitation et
              d&apos;opposition, qu&apos;il exerce en écrivant à
              contact@hotel-voiles.com.
            </p>
            <p>
              Les données de carte bancaire ne sont pas conservées par l&apos;hôtel : elles
              sont détenues par son prestataire de paiement, sous sa propre
              certification de sécurité.
            </p>
          </Section>

          <Section n={12} titre="Réclamations et médiation">
            <p>
              Toute réclamation doit être adressée à l&apos;hôtel, de préférence par
              écrit, à contact@hotel-voiles.com. L&apos;hôtel s&apos;engage à y répondre
              dans un délai raisonnable.
            </p>
            <p>
              Conformément à l&apos;<strong>article L612-1 du code de la consommation</strong>,
              le client qui n&apos;a pas obtenu satisfaction auprès de l&apos;hôtel peut
              recourir gratuitement à un médiateur de la consommation :
            </p>
            <p>
              <ACompleter>
                nom, adresse postale et site du médiateur de la consommation auquel
                l&apos;établissement adhère — cette adhésion est une obligation légale
              </ACompleter>
            </p>
            <p>
              Le client peut également saisir la plateforme européenne de règlement en
              ligne des litiges.
            </p>
          </Section>

          <Section n={13} titre="Droit applicable">
            <p>
              Les présentes conditions sont soumises au <strong>droit français</strong>.
            </p>
            <p>
              À défaut de résolution amiable, le litige relève des juridictions
              compétentes dans les conditions du droit commun. Les dispositions
              protectrices du consommateur restent applicables.
            </p>
          </Section>

          <p className="border-t border-slate-300 pt-6 text-sm text-slate-500">
            Conditions générales de vente en vigueur au {MAJ}. L&apos;hôtel se réserve le
            droit de les modifier à tout moment ; la version applicable à une
            réservation est celle en vigueur au jour où celle-ci a été confirmée.
          </p>
        </div>
      </div>
    </div>
  );
}
