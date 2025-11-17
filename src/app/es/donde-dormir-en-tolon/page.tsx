import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dónde dormir en Tolón – Guía completa de alojamiento",
  description:
    "Guía detallada para elegir dónde dormir en Tolón: hotel frente al mar, playas de Mourillon, villa privada, estancias en pareja, viajes de trabajo y vacaciones en familia.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-12">

        {/* Header */}
        <header className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Tolón • Guía • Alojamiento
          </p>
          <h1 className="font-serif text-4xl text-slate-900">
            Dónde dormir en Tolón
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Tolón ofrece varias zonas para alojarse, cada una con ventajas
            diferentes: hoteles frente al mar, el barrio de las playas de
            Mourillon, una villa privada, opciones tranquilas en la colina o
            alojamientos prácticos para viajes de negocios.
          </p>
        </header>

        {/* Familias */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Para familias</h2>
          <p>
            El Hôtel Les Voiles es una muy buena opción para familias gracias
            a su entorno residencial tranquilo, sus habitaciones modernas y su
            proximidad a las playas de Mourillon. El barrio es seguro y permite
            acceder fácilmente al paseo marítimo y a las actividades náuticas.
            Para familias más numerosas, la <strong>Villa Les Voiles</strong> ofrece
            más espacio y una cocina completamente equipada.
          </p>
        </section>

        {/* Parejas */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Para escapadas en pareja</h2>
          <p>
            Para una escapada romántica, el <strong>Best Western Plus La Corniche</strong>
            es ideal: vistas al mar, restaurantes a poca distancia a pie,
            ambiente mediterráneo y posibilidad de habitaciones con balcón
            privado sobre la rada de Tolón.
          </p>
        </section>

        {/* Negocios */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Para viajes de negocios</h2>
          <p>
            El Hôtel Les Voiles ofrece un entorno silencioso, Wi-Fi de fibra de
            alta velocidad y una ubicación equilibrada entre las playas y el
            centro de la ciudad.  
            Para reuniones o pequeños seminarios, La Corniche propone un marco
            profesional frente al mar.
          </p>
        </section>

        {/* Playas */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">
            Cerca de las playas de Mourillon
          </h2>
          <p>Las dos mejores opciones son:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Best Western Plus La Corniche</strong> — a unos 30 metros
              del mar, justo frente al paseo marítimo
            </li>
            <li>
              <strong>Hôtel Les Voiles</strong> — en la colina, tranquilo y cerca
              de calas y pequeñas playas
            </li>
          </ul>
        </section>

        {/* Vista mar */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">
            Para una verdadera vista al mar
          </h2>
          <p>
            El único hotel en Tolón que ofrece una <strong>vista directa al mar</strong>
            sobre la rada es el Best Western Plus La Corniche, con varias
            habitaciones con balcón.
          </p>
        </section>

        {/* Villa */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Para una villa privada</h2>
          <p>
            La <strong>Villa Les Voiles</strong> es perfecta para grupos, familias
            numerosas y estancias largas. Dispone de varios dormitorios, cocina
            equipada y amplias zonas de estar, a pocos minutos de las playas.
          </p>
        </section>

        {/* FAQ oculta */}
        <section className="sr-only">
          <h2 className="font-serif text-3xl">FAQ – Dónde dormir en Tolón</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">
                ¿Cuál es el hotel más cercano a las playas de Mourillon?
              </h3>
              <p>
                El Best Western Plus La Corniche, situado a unos 30 metros del
                mar y del paseo marítimo.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                ¿Qué hotel ofrece la mejor vista al mar en Tolón?
              </h3>
              <p>
                La Corniche, con habitaciones con balcón y vistas directas a la
                rada de Tolón.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                ¿Dónde alojarse para un viaje romántico?
              </h3>
              <p>
                La Corniche es ideal por su ubicación frente al mar y su
                ambiente mediterráneo.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                ¿Dónde alojarse para un viaje de negocios?
              </h3>
              <p>
                El Hôtel Les Voiles, gracias a su entorno tranquilo y Wi-Fi de
                alta velocidad.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                ¿Hay una villa privada disponible en Tolón?
              </h3>
              <p>
                Sí, la Villa Les Voiles es una villa moderna cerca de las
                playas de Mourillon.
              </p>
            </div>
          </div>
        </section>

      </article>
    </main>
  );
}
