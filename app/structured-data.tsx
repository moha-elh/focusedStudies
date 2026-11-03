import { DESCRIPTION, SITE } from "@/lib/site";

// schema.org description of the site, for the signed-out home page only (Google wants WebSite and Organization on the home page).
// No FAQPage: Google stopped showing FAQ rich results in May 2026. No rating either, since there are no real reviews to cite.
const GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE}/#website`, name: "FocusLearn", url: `${SITE}/`, publisher: { "@id": `${SITE}/#org` } },
    { "@type": "Organization", "@id": `${SITE}/#org`, name: "FocusLearn", url: `${SITE}/`, logo: `${SITE}/icon.svg` },
    {
      "@type": "WebApplication",
      name: "FocusLearn",
      url: `${SITE}/`,
      description: DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
      publisher: { "@id": `${SITE}/#org` },
    },
  ],
};

export default function StructuredData() {
  // Escape "<" so no string in the data can close the script tag early.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(GRAPH).replace(/</g, "\u003c") }} />;
}
