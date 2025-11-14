import React from 'react';

const PrivacyPage: React.FC = () => {
  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">🧾 Privacy Policy – Pizza Spartaco</h1>
          <p className="mt-3 text-white/80">Questa informativa descrive come trattiamo i dati personali degli utenti che visitano o utilizzano i nostri servizi online.</p>
        </header>

        <div className="space-y-10 text-white/90">
          <section>
            <h2 className="text-2xl font-bold text-white">1. Titolare del Trattamento dei Dati</h2>
            <div className="mt-3 space-y-2">
              <p>Nome del ristorante: Pizza Spartaco</p>
              <p>Indirizzo: Viale Spartaco, 73, 00174 Roma RM</p>
              <p>Email di contatto: ordini@pizzaspartaco.it</p>
              <p>Telefono:  380 904 5366</p>
              <p>Titolare del trattamento: Luca Golino</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">2. Tipologie di dati raccolti</h2>
            <div className="mt-3 space-y-3">
              <p>
                Durante la navigazione del sito, possiamo raccogliere:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <span className="font-semibold">Dati forniti volontariamente</span>: nome, cognome, email, telefono, messaggi inviati tramite moduli di contatto o prenotazione.
                </li>
                <li>
                  <span className="font-semibold">Dati di navigazione</span>: indirizzo IP, tipo di browser, orario di accesso, pagine visitate (raccolti in modo anonimo tramite cookie tecnici o analitici).
                </li>
                <li>
                  <span className="font-semibold">Cookie e strumenti di tracciamento</span>: utilizzati per migliorare l’esperienza dell’utente, misurare le performance del sito e gestire prenotazioni o campagne pubblicitarie (vedi sezione “Cookie Policy”).
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">3. Finalità del trattamento</h2>
            <ul className="mt-3 list-disc list-inside space-y-2">
              <li>Gestire richieste di informazioni o prenotazioni online.</li>
              <li>Fornire assistenza clienti o rispondere a richieste via email o telefono.</li>
              <li>Gestire newsletter o comunicazioni promozionali, previo consenso.</li>
              <li>Analizzare l’uso del sito e migliorare i servizi offerti.</li>
              <li>Adempiere a obblighi legali e fiscali (es. fatture, ricevute, contabilità).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">4. Base giuridica del trattamento</h2>
            <ul className="mt-3 list-disc list-inside space-y-2">
              <li>Consenso dell’utente (art. 6.1.a GDPR) per comunicazioni marketing e cookie di profilazione.</li>
              <li>Esecuzione di un contratto o misure precontrattuali (art. 6.1.b) per prenotazioni e richieste.</li>
              <li>Obblighi legali (art. 6.1.c) per scopi fiscali e contabili.</li>
              <li>Interesse legittimo (art. 6.1.f) per la sicurezza del sito e la prevenzione di abusi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">5. Modalità di trattamento</h2>
            <p className="mt-3">I dati vengono trattati con strumenti informatici e cartacei, adottando misure di sicurezza adeguate per prevenire accessi non autorizzati, perdite o modifiche.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">6. Conservazione dei dati</h2>
            <ul className="mt-3 list-disc list-inside space-y-2">
              <li>Fino a massimo 12 mesi per richieste generiche o contatti.</li>
              <li>Fino a 10 anni per dati amministrativi e fiscali.</li>
              <li>Fino a revoca del consenso per comunicazioni promozionali.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">7. Comunicazione e diffusione dei dati</h2>
            <div className="mt-3 space-y-3">
              <p>I dati possono essere comunicati a:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Fornitori di servizi tecnici e gestionali (es. hosting, CRM, email marketing, sistemi di prenotazione).</li>
                <li>Consulenti fiscali o legali per adempimenti obbligatori.</li>
                <li>Autorità competenti, solo se richiesto per legge.</li>
              </ul>
              <p className="mt-2">Terze parti che possono accedere ai dati tramite il sito:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Google Analytics (statistiche anonimizzate)</li>
                <li>Facebook / Instagram (plugin social e campagne ADV)</li>
              </ul>
              <p className="mt-2">Ciascuna terza parte ha la propria informativa consultabile sui rispettivi siti web.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">8. Diritti dell’utente (GDPR art. 15–22)</h2>
            <div className="mt-3 space-y-3">
              <p>Gli utenti possono in ogni momento:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Richiedere accesso, rettifica, cancellazione o limitazione dei dati.</li>
                <li>Opporsi al trattamento per finalità di marketing.</li>
                <li>Richiedere la portabilità dei dati.</li>
                <li>Revocare il consenso in qualsiasi momento.</li>
              </ul>
              <p className="mt-2">Le richieste possono essere inviate a: capitalnet.web@gmail.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">9. Cookie Policy</h2>
            <div className="mt-3 space-y-3">
              <p>Il sito utilizza cookie per:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Cookie tecnici (necessari al funzionamento del sito e alle prenotazioni).</li>
                <li>Cookie analitici (anonimi, per statistiche d’uso).</li>
                <li>Cookie di profilazione e marketing (solo previo consenso esplicito).</li>
              </ul>
              <p className="mt-2">
                All’apertura del sito viene mostrato un cookie banner che:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Permette di accettare o rifiutare tutti i cookie in egual misura.</li>
                <li>Consente di modificare le preferenze in qualsiasi momento tramite il link “Impostazioni Cookie” presente nel footer del sito.</li>
              </ul>
              <p className="mt-2">Per maggiori dettagli: vedi la Cookie Policy completa.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">10. Aggiornamenti e modifiche</h2>
            <p className="mt-3">Questa informativa può essere aggiornata in qualsiasi momento. Data di ultima modifica: 04/11/2025</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">11. Contatti per richieste privacy</h2>
            <div className="mt-3 space-y-2">
              <p>📧 Email: capitalnet.web@gmail.com</p>
              <p>🏠 Indirizzo:Viale Spartaco, 73, 00174 Roma RM </p>
              <p>📞 Telefono: 380 904 5366 </p>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

export default PrivacyPage;