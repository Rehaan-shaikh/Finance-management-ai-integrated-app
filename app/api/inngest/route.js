import { inngest } from "@/lib/ingest/client";
import { helloWorld } from "@/lib/ingest/function";
import { serve } from "inngest/next";
import { checkBudgetAlerts } from "../../../lib/ingest/function";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    /* your functions will be passed here later! */
    checkBudgetAlerts,
  ],
});
