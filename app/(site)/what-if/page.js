import WhatIfExplorer from "@/components/WhatIfExplorer";
import { recordPageView } from "@/lib/db/analytics";

// Reads live fleet data indirectly (WhatIfExplorer calls the analyze API,
// which reads the database), so this stays dynamic rather than statically
// prerendered, consistent with every other data-backed route in this app.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Zebra AI What If, Zebra Motors",
  description:
    "Describe a trip scenario in your own words and see which real Zebra Motors vehicle fits, with transparent, rule-based reasoning, not a chatbot.",
};

export default function WhatIfPage({ searchParams }) {
  recordPageView("/what-if");
  const initialText = typeof searchParams?.text === "string" ? searchParams.text : "";
  return <WhatIfExplorer initialText={initialText} />;
}
