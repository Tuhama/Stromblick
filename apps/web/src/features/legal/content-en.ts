import type { LegalContent } from "./legal-types";

export const contentEn: LegalContent = {
  imprint: {
    title: "Legal notice (Impressum)",
    intro: "This page also exists in German. The German version is the legally binding one.",
    asOf: "As of 24 November 2026",
    sections: [
      { id: "provider", heading: "Information according to § 5 DDG", address: true },
      {
        id: "contact",
        heading: "Contact",
        paragraphs: ["The fastest way to reach me is email."],
        email: true,
      },
      {
        id: "responsible",
        heading: "Responsible for the content according to § 18 (2) MStV",
        address: true,
      },
      {
        id: "project",
        heading: "About this site",
        paragraphs: [
          "Stromblick is a private, non-commercial portfolio project. It shows data from the German electricity market. It is not investment, trading or energy advice.",
        ],
      },
      {
        id: "data",
        heading: "Data source",
        paragraphs: [
          "Electricity market data: Bundesnetzagentur | SMARD.de, licensed under CC BY 4.0. The data was processed for this site: summarized, converted and rounded. The Bundesnetzagentur is not responsible for this site.",
        ],
      },
      {
        id: "liability",
        heading: "Liability for content",
        paragraphs: [
          "I take care with the content of this site. I cannot guarantee that the data, the charts and the answers of the AI assistant are correct, complete or up to date. Check important figures at the source.",
          "As a service provider I am responsible for my own content under the general laws (§ 7 (1) DDG). According to §§ 8 to 10 DDG I am not obliged to monitor transmitted or stored third-party information. If I learn of a legal violation, I remove the content without delay.",
        ],
      },
      {
        id: "links",
        heading: "Liability for links",
        paragraphs: [
          "This site links to external pages. I have no influence on their content and take no responsibility for it. The operators of the linked pages are responsible for their content.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy notice",
    intro: "This page also exists in German. The German version is the legally binding one.",
    asOf: "As of 24 November 2026",
    sections: [
      {
        id: "controller",
        heading: "Who is responsible",
        paragraphs: ["The controller under the GDPR is:"],
        address: true,
        email: true,
      },
      {
        id: "summary",
        heading: "In short",
        items: [
          "There are no accounts and no sign-in.",
          "There are no cookies, no advertising and no analytics or tracking services.",
          "The AI assistant sends your questions to Google (see below).",
          "Your settings (language, theme, price unit) stay in your own browser.",
        ],
      },
      {
        id: "hosting",
        heading: "Hosting and server logs",
        paragraphs: [
          "The web pages are delivered by Vercel Inc. (USA). The interface that serves the data (the API) runs at Railway Corporation (USA), on servers in the EU (region EU West). The database is hosted by Neon in Frankfurt and holds only market data, nothing about visitors.",
          "When you open the site, these providers process technical data that your browser sends: your IP address, the date and time, the address you asked for, your browser's identification and the size of the answer. They do this to deliver the site, keep it secure and fend off misuse. My own API logs hold only the method, the path, the status code and a request number, no IP addresses.",
          "To limit the number of requests per minute, the API keeps your IP address in its memory for the current one-minute window. It is not stored and is gone when the API restarts.",
          "The legal basis is Art. 6 (1) (f) GDPR. My legitimate interest is running the site securely and reliably.",
          "Vercel and Railway are US companies, so data can be reached from the USA even where the servers are in the EU. The transfer relies on the adequacy decision for the EU-US Data Privacy Framework or on EU standard contractual clauses of the provider (Art. 45 and 46 GDPR).",
        ],
      },
      {
        id: "assistant",
        heading: "AI assistant",
        paragraphs: [
          "When you ask the assistant a question, the web app sends it to the API. The API passes the question, up to ten earlier messages of this conversation and an instruction text to Google's Gemini service. The model can look up market data. These lookups contain nothing about you.",
          "The conversation exists only in your browser's memory. It is gone when you close the page or start a new conversation. The API does not store your questions or the answers. Its logs contain only the names of the data that were looked up (series and time range), never your text.",
          "Google processes the data as a paid service of the Gemini API. According to Google's terms, Google then does not use your prompts and answers to improve its products. It keeps logs for a limited time to detect misuse, to keep the service safe and to meet legal duties. The data may be stored in any country where Google has facilities.",
          "Please do not enter personal data into the assistant.",
          "The legal basis is Art. 6 (1) (f) GDPR. My legitimate interest is offering the assistant that you start yourself. The transfer to Google in the USA relies on the adequacy decision for the EU-US Data Privacy Framework or on standard contractual clauses (Art. 45 and 46 GDPR).",
        ],
      },
      {
        id: "storage",
        heading: "Settings in your browser",
        paragraphs: [
          "The site saves three settings in your browser's local storage: the language, the color scheme and the price unit. They never leave your browser. They are technically necessary so that the site remembers your choice (§ 25 (2) no. 2 TDDDG), so no consent is needed. You can delete them in your browser settings.",
        ],
      },
      {
        id: "external",
        heading: "External content",
        paragraphs: [
          "The site loads no fonts, scripts or images from other servers and has no social media buttons.",
          "The market data comes from the SMARD platform of the Bundesnetzagentur. The API server fetches it. No data about visitors is sent there.",
        ],
      },
      {
        id: "rights",
        heading: "Your rights",
        paragraphs: [
          "You have the right to access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object (Art. 21). If processing is based on my legitimate interest, you can object to it at any time for reasons arising from your situation.",
          "Write to me by email to use these rights. Because I do not keep logs of visitors, I can only find data about you if you tell me roughly when you visited.",
          "You can also complain to a data protection authority. The one responsible for me is: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Postfach 3163, 65021 Wiesbaden, Germany.",
        ],
      },
      {
        id: "changes",
        heading: "Changes",
        paragraphs: ["I update this notice when the site or the law changes."],
      },
    ],
  },
};
