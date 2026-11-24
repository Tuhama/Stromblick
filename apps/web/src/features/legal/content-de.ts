import type { LegalContent } from "./legal-types";

export const contentDe: LegalContent = {
  imprint: {
    title: "Impressum",
    intro: "Diese Seite gibt es auch auf Englisch. Maßgeblich ist die deutsche Fassung.",
    asOf: "Stand: 24. November 2026",
    sections: [
      { id: "provider", heading: "Angaben gemäß § 5 DDG", address: true },
      {
        id: "contact",
        heading: "Kontakt",
        paragraphs: ["Am schnellsten erreichst du mich per E-Mail."],
        email: true,
      },
      {
        id: "responsible",
        heading: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
        address: true,
      },
      {
        id: "project",
        heading: "Über dieses Angebot",
        paragraphs: [
          "Stromblick ist ein privates, nicht kommerzielles Portfolioprojekt. Es zeigt Daten des deutschen Strommarkts. Es ist keine Anlage-, Handels- oder Energieberatung.",
        ],
      },
      {
        id: "data",
        heading: "Datenquelle",
        paragraphs: [
          "Strommarktdaten: Bundesnetzagentur | SMARD.de, lizenziert unter CC BY 4.0. Die Daten wurden für diese Seite aufbereitet: zusammengefasst, umgerechnet und gerundet. Die Bundesnetzagentur ist für diese Seite nicht verantwortlich.",
        ],
      },
      {
        id: "liability",
        heading: "Haftung für Inhalte",
        paragraphs: [
          "Ich erstelle die Inhalte dieser Seite mit Sorgfalt. Ich kann aber nicht garantieren, dass die Daten, die Diagramme und die Antworten des KI-Assistenten richtig, vollständig und aktuell sind. Prüfe wichtige Zahlen bitte an der Quelle.",
          "Als Diensteanbieter bin ich für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich (§ 7 Abs. 1 DDG). Nach den §§ 8 bis 10 DDG bin ich nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Wenn ich von einer Rechtsverletzung erfahre, entferne ich den Inhalt unverzüglich.",
        ],
      },
      {
        id: "links",
        heading: "Haftung für Links",
        paragraphs: [
          "Diese Seite verlinkt auf externe Seiten. Auf deren Inhalte habe ich keinen Einfluss und übernehme dafür keine Gewähr. Für die Inhalte der verlinkten Seiten sind deren Betreiber verantwortlich.",
        ],
      },
    ],
  },
  privacy: {
    title: "Datenschutzerklärung",
    intro: "Diese Seite gibt es auch auf Englisch. Maßgeblich ist die deutsche Fassung.",
    asOf: "Stand: 24. November 2026",
    sections: [
      {
        id: "controller",
        heading: "Verantwortlicher",
        paragraphs: ["Verantwortlich im Sinne der DSGVO ist:"],
        address: true,
        email: true,
      },
      {
        id: "summary",
        heading: "Das Wichtigste in Kürze",
        items: [
          "Es gibt keine Konten und keine Anmeldung.",
          "Es gibt keine Cookies, keine Werbung und keine Analyse- oder Tracking-Dienste.",
          "Der KI-Assistent sendet deine Fragen an Google (siehe unten).",
          "Deine Einstellungen (Sprache, Farbschema, Preiseinheit) bleiben in deinem eigenen Browser.",
        ],
      },
      {
        id: "hosting",
        heading: "Hosting und Server-Logdateien",
        paragraphs: [
          "Die Webseiten werden von Vercel Inc. (USA) ausgeliefert. Die Schnittstelle, die die Daten bereitstellt (die API), läuft bei Railway Corporation (USA), auf Servern in der EU (Region EU West). Die Datenbank liegt bei Neon in Frankfurt und enthält nur Marktdaten, nichts über Besucher.",
          "Wenn du die Seite aufrufst, verarbeiten diese Anbieter technische Daten, die dein Browser sendet: deine IP-Adresse, Datum und Uhrzeit, die angefragte Adresse, die Kennung deines Browsers und die Größe der Antwort. Sie tun das, um die Seite auszuliefern, sicher zu betreiben und Missbrauch abzuwehren. Die eigenen Logdateien meiner API enthalten nur die Methode, den Pfad, den Statuscode und eine Anfragenummer, keine IP-Adressen.",
          "Um die Zahl der Anfragen pro Minute zu begrenzen, hält die API deine IP-Adresse für das laufende Ein-Minuten-Fenster im Arbeitsspeicher. Sie wird nicht gespeichert und ist beim Neustart der API weg.",
          "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Mein berechtigtes Interesse ist der sichere und stabile Betrieb der Seite.",
          "Vercel und Railway sind US-Unternehmen, daher kann auch dort, wo die Server in der EU stehen, aus den USA auf Daten zugegriffen werden. Die Übermittlung stützt sich auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework oder auf EU-Standardvertragsklauseln des Anbieters (Art. 45 und 46 DSGVO).",
        ],
      },
      {
        id: "assistant",
        heading: "KI-Assistent",
        paragraphs: [
          "Wenn du dem Assistenten eine Frage stellst, sendet die Web-App sie an die API. Die API gibt die Frage, bis zu zehn frühere Nachrichten dieses Gesprächs und einen Anweisungstext an Googles Gemini-Dienst weiter. Das Modell kann Marktdaten abfragen. Diese Abfragen enthalten nichts über dich.",
          "Das Gespräch existiert nur im Arbeitsspeicher deines Browsers. Es ist weg, wenn du die Seite schließt oder ein neues Gespräch beginnst. Die API speichert deine Fragen und die Antworten nicht. Ihre Logdateien enthalten nur die Namen der abgefragten Daten (Datenreihe und Zeitraum), nie deinen Text.",
          "Google verarbeitet die Daten als kostenpflichtigen Dienst („Paid Service“) der Gemini API. Nach Googles Bedingungen nutzt Google deine Eingaben und die Antworten dann nicht, um seine Produkte zu verbessern. Google führt für begrenzte Zeit Protokolle, um Missbrauch zu erkennen, den Dienst sicher zu halten und gesetzliche Pflichten zu erfüllen. Die Daten können in jedem Land gespeichert werden, in dem Google Standorte hat.",
          "Bitte gib im Assistenten keine personenbezogenen Daten ein.",
          "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Mein berechtigtes Interesse ist es, den Assistenten anzubieten, den du selbst startest. Die Übermittlung an Google in die USA stützt sich auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework oder auf Standardvertragsklauseln (Art. 45 und 46 DSGVO).",
        ],
      },
      {
        id: "storage",
        heading: "Einstellungen in deinem Browser",
        paragraphs: [
          "Die Seite speichert drei Einstellungen im lokalen Speicher deines Browsers: die Sprache, das Farbschema und die Preiseinheit. Sie verlassen deinen Browser nicht. Sie sind technisch erforderlich, damit die Seite sich deine Wahl merkt (§ 25 Abs. 2 Nr. 2 TDDDG). Eine Einwilligung ist dafür nicht nötig. Du kannst sie in den Einstellungen deines Browsers löschen.",
        ],
      },
      {
        id: "external",
        heading: "Externe Inhalte",
        paragraphs: [
          "Die Seite lädt keine Schriften, Skripte oder Bilder von fremden Servern und hat keine Social-Media-Schaltflächen.",
          "Die Marktdaten stammen von der Plattform SMARD der Bundesnetzagentur. Der Server der API ruft sie ab. Dabei werden keine Daten über Besucher dorthin gesendet.",
        ],
      },
      {
        id: "rights",
        heading: "Deine Rechte",
        paragraphs: [
          "Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Beruht die Verarbeitung auf meinem berechtigten Interesse, kannst du ihr jederzeit aus Gründen widersprechen, die sich aus deiner besonderen Situation ergeben.",
          "Schreibe mir per E-Mail, um diese Rechte auszuüben. Weil ich keine Protokolle über Besucher führe, kann ich Daten über dich nur finden, wenn du mir ungefähr sagst, wann du die Seite besucht hast.",
          "Du kannst dich außerdem bei einer Datenschutzbehörde beschweren. Für mich zuständig ist: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Postfach 3163, 65021 Wiesbaden.",
        ],
      },
      {
        id: "changes",
        heading: "Änderungen",
        paragraphs: [
          "Ich passe diese Erklärung an, wenn sich die Seite oder die Rechtslage ändert.",
        ],
      },
    ],
  },
};
