// src/app/en/terms/page.tsx
//
// ⚠️ LA VERSION ANGLAISE DES CGV — ET ELLE N'EST PAS DÉCORATIVE.
// Le tunnel anglais `/en/book` est passé en production le 27/08/2026 en même
// temps que le français. Un client anglophone y achète une nuit, avec débit
// immédiat sur le tarif prépayé. Le laisser acheter sous des conditions qu'il
// ne peut pas lire, c'est vendre sans conditions opposables à lui.
//
// ⚠️ ELLE DOIT RESTER LE MIROIR EXACT DE `/cgv`. Toute règle modifiée d'un côté
// se modifie de l'autre le même jour. Deux textes qui divergent, c'est le
// client qui a raison contre l'hôtel — et il choisira la version qui l'arrange.
//
// ⚠️ LE DROIT APPLICABLE RESTE LE DROIT FRANÇAIS, et le texte le dit. Traduire
// n'est pas changer de juridiction : l'article L221-28 s'applique à un client
// londonien qui réserve à Toulon exactement comme à un client toulonnais.
//
// Mêmes deux trous que la version française, marqués pareil : le médiateur de
// la consommation et l'assurance annulation.

import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { alternatesFor } from "@/lib/site";

export const metadata: Metadata = {
  alternates: alternatesFor("/en/terms"),
  title: "Terms and conditions of sale — Hôtel-Rooftop Les Voiles, Toulon",
  description:
    "Terms and conditions for stays booked directly at Hôtel-Rooftop Les Voiles: prices, payment, cancellation, arrival and departure.",
};

/* Doit rester identique à la date de `/cgv`. Écrite à la main : elle bouge
   quand le TEXTE bouge, pas quand le site se redéploie. */
const MAJ = "27 August 2026";

function Section({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl text-slate-900 mb-4">{n}. {titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToComplete({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-amber-100 px-1 font-semibold text-amber-900">
      [TO COMPLETE — {children}]
    </mark>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-cream p-6 font-sans text-slate-900 md:p-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/en"
          className="mb-12 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <h1 className="mb-2 font-serif text-4xl md:text-5xl">Terms and conditions of sale</h1>
        <p className="mb-10 text-sm text-slate-500">
          Hôtel-Rooftop Les Voiles — Toulon Mourillon · Version of {MAJ}
        </p>

        <div className="space-y-10 leading-relaxed text-slate-600">

          <Section n={1} titre="Purpose">
            <p>
              These terms and conditions govern bookings made <strong>directly</strong> with
              Hôtel-Rooftop Les Voiles, on <strong>hotels-toulon-mer.com</strong>, by telephone
              or by email.
            </p>
            <p>
              They do not apply to bookings made through an online travel agency or any
              other distributor, which are governed by that distributor&apos;s own terms.
            </p>
            <p>
              Making a booking means accepting these terms in full. They are made
              available before you enter any card details, and remain accessible at
              this address at all times.
            </p>
          </Section>

          <Section n={2} titre="The seller">
            <p>
              Hôtel-Rooftop Les Voiles is located at <strong>124 rue Gubler, 83000
              Toulon, France</strong>.<br />
              Telephone: <a href="tel:+33494413623" className="underline">+33 4 94 41 36 23</a><br />
              Email: <a href="mailto:contact@hotel-voiles.com" className="underline">contact@hotel-voiles.com</a>
            </p>
            <p>
              The hotel is operated — and stays are sold and charged — by
              <strong> SAS LES VOILES</strong>, a French simplified joint-stock company.<br />
              Registered office: 124 rue Gubler, 83000 Toulon, France<br />
              SIREN: 795 063 304 — SIRET: 795 063 304 00021<br />
              Toulon Trade and Companies Register 795 063 304<br />
              VAT number: FR82 795 063 304
            </p>
            <p>
              The website <strong>hotels-toulon-mer.com</strong>, which presents several
              properties, is published by <strong>SARL SUERE</strong> — a separate company.
              Only SAS LES VOILES is party to the accommodation contract governed by
              these terms.
            </p>
          </Section>

          <Section n={3} titre="What is booked">
            <p>
              A booking covers one room, for a set number of guests and nights.
              <strong> Breakfast is included</strong> in both rates offered directly.
            </p>
            <p>
              Photographs and descriptions are indicative. The hotel guarantees the
              room <em>category</em> booked, not a specific room: allocation happens on
              arrival.
            </p>
            <p>
              Optional extras — a rooftop table, drinks, other services — are not
              included in the room price and are paid separately, unless stated
              otherwise at the time of booking.
            </p>
          </Section>

          <Section n={4} titre="Prices">
            <p>
              Prices are shown in euros, <strong>inclusive of all taxes</strong>, per room
              and for the whole of the booked stay.
            </p>
            <p>
              <strong>The price shown includes the local tourist tax</strong>, currently
              <strong> €1.86 per adult per night</strong>. The total shown before payment is
              the total due: the hotel adds nothing afterwards.
            </p>
            <p>
              Prices vary with dates and occupancy. The price that applies is the one
              displayed when the booking is confirmed; later changes do not affect a
              booking already made.
            </p>
            <p>
              A change to the tourist tax rate decided by the authorities applies from
              the date it takes effect, including to earlier bookings.
            </p>
          </Section>

          <Section n={5} titre="How a booking is made">
            <p>
              You choose your dates, room and rate, provide your details, then your card
              details. The booking is <strong>final</strong> once the hotel confirms it and
              issues a confirmation number.
            </p>
            <p>
              Until that number is issued, no room is held. A booking started but not
              completed is released automatically after twenty minutes.
            </p>
            <p>
              You are responsible for the accuracy of the details you provide,
              particularly your email address: that is where the confirmation is sent.
            </p>
          </Section>

          <Section n={6} titre="Payment">
            <p>
              A valid payment card is required for every booking. Card details are
              entered in a secure frame hosted by the hotel&apos;s payment provider and
              <strong> never pass through, nor are stored by, this website</strong>. The hotel
              never sees your full card number.
            </p>
            <p>
              Payments are handled by <strong>Mews Systems</strong>, the hotel&apos;s payment
              services provider, and its card-data security solution. Strong customer
              authentication may be required, in line with applicable payment services
              regulations.
            </p>
            <p>
              What happens to your card depends on the rate you choose, and is stated
              before you confirm:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Flexible rate</strong> — your card is not charged at booking. A
                <strong> card guarantee</strong> secures the room. You settle at the hotel,
                tourist tax included.
              </li>
              <li>
                <strong>Prepaid rate</strong> — <strong>the full stay is charged at
                booking</strong>. This rate is non-cancellable and non-refundable (see
                clause 7).
              </li>
            </ul>
            <p>
              If the card is declined or authentication fails, no booking is made and no
              room is held.
            </p>
          </Section>

          <Section n={7} titre="Cancellation and changes">
            <p>
              Conditions depend on the rate chosen. They are stated when you choose it
              and repeated on your confirmation.
            </p>
            <p>
              <strong>Flexible rate</strong> — free cancellation
              <strong> until 6 pm (Paris time) on the day of arrival</strong>. After that
              time, or in case of no-show, the hotel may charge the <strong>first
              night</strong>, tourist tax included, to the card used to guarantee the
              booking.
            </p>
            <p>
              <strong>Prepaid rate</strong> — <strong>non-cancellable and
              non-refundable</strong>, whenever the cancellation occurs, including no-show
              and early departure. That is the trade-off for its lower price.
            </p>
            <p>
              Cancellations and changes are made by telephone on +33 4 94 41 36 23 or by
              email to contact@hotel-voiles.com, quoting your confirmation number.
              Changing dates or length of stay amounts to a new booking, at the rate
              then available.
            </p>
            <p>
              <ToComplete>
                state whether cancellation insurance is offered, and by which insurer
              </ToComplete>
            </p>
          </Section>

          <Section n={8} titre="No right of withdrawal">
            <p>
              Under <strong>article L221-28 of the French Consumer Code</strong>, the right
              of withdrawal does not apply to accommodation services supplied on a
              specific date or for a specific period.
            </p>
            <p>
              <strong>There is therefore no fourteen-day cooling-off period.</strong> Only
              the cancellation conditions of your rate, set out in clause 7, apply.
            </p>
          </Section>

          <Section n={9} titre="Arrival and departure">
            <p>
              Rooms are available <strong>from 3 pm</strong> on the day of arrival.
              Self check-in is possible from that time; details are sent before your stay.
            </p>
            <p>
              Departure is <strong>by 12 noon</strong> on the day of departure for every
              booking made directly. A later departure may be granted subject to
              availability and may be charged.
            </p>
            <p>
              Photographic identification is required on arrival, as required of
              accommodation providers under French law.
            </p>
          </Section>

          <Section n={10} titre="Conduct and liability">
            <p>
              Guests undertake to use the room and communal areas peaceably. The hotel
              may end a stay without refund in the event of conduct contrary to public
              order or decency, or likely to disturb other guests.
            </p>
            <p>
              Damage to the room or communal areas is charged to the guest, against
              supporting evidence.
            </p>
            <p>
              The hotel&apos;s liability for items deposited by guests is governed by
              <strong> articles 1952 to 1954 of the French Civil Code</strong>.
            </p>
          </Section>

          <Section n={11} titre="Personal data">
            <p>
              The details provided when booking are needed to perform and invoice the
              stay. They are kept for as long as the hotel&apos;s accounting and tax
              obligations require, then deleted.
            </p>
            <p>
              Under the General Data Protection Regulation, you have the right to access,
              rectify, erase, restrict and object to the processing of your data, by
              writing to contact@hotel-voiles.com.
            </p>
            <p>
              Card details are not kept by the hotel: they are held by its payment
              provider, under that provider&apos;s own security certification.
            </p>
          </Section>

          <Section n={12} titre="Complaints and mediation">
            <p>
              Complaints should be addressed to the hotel, preferably in writing, at
              contact@hotel-voiles.com. The hotel undertakes to reply within a
              reasonable time.
            </p>
            <p>
              Under <strong>article L612-1 of the French Consumer Code</strong>, a consumer
              who is not satisfied by the hotel&apos;s response may refer the matter free
              of charge to a consumer ombudsman:
            </p>
            <p>
              <ToComplete>
                name, postal address and website of the consumer ombudsman the hotel is
                registered with — this registration is a legal obligation
              </ToComplete>
            </p>
            <p>
              You may also use the European online dispute resolution platform.
            </p>
          </Section>

          <Section n={13} titre="Governing law">
            <p>
              These terms are governed by <strong>French law</strong>. Translating them does
              not change the applicable law or jurisdiction.
            </p>
            <p>
              Failing an amicable settlement, disputes fall to the courts having
              jurisdiction under ordinary law. Consumer protection provisions continue
              to apply.
            </p>
          </Section>

          <p className="border-t border-slate-300 pt-6 text-sm text-slate-500">
            Terms and conditions in force as of {MAJ}. The hotel may amend them at any
            time; the version applying to a booking is the one in force on the day that
            booking was confirmed. In case of any discrepancy, the{" "}
            <Link href="/cgv" className="underline">French version</Link> prevails.
          </p>
        </div>
      </div>
    </div>
  );
}
