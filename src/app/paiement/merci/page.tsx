// Retour après paiement réussi (success_url Stripe). La confirmation de la
// réservation est faite côté serveur par le webhook ; cette page est l'accusé visuel.
export default function PaiementMerciPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5" style={{ background: "#f6f8fa" }}>
      <div className="bg-white rounded-3xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(0,78,124,.08)", color: "#004e7c" }}>
          <span style={{ fontSize: 28 }}>✓</span>
        </div>
        <h1 className="font-serif font-semibold text-2xl text-slate-800 mt-4">Paiement reçu</h1>
        <p className="text-slate-500 text-sm mt-2">Merci, votre réservation est confirmée. Un reçu vous a été envoyé par email.</p>
        <p className="text-[11px] text-slate-400 mt-5">Best Western Plus La Corniche</p>
      </div>
    </main>
  );
}
