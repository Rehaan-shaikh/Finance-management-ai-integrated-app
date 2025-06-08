import { inngest } from "@/lib/ingest/client";
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



//Working
// This code sets up an Inngest API route but the it should be inside api/inngest so that it can be served by inngest
// after running `npx inngest dev` in other terminal
// | Component            | What It Does                                              |
// | -------------------- | --------------------------------------------------------- |
// | `serve({...})`       | Sets up Next.js API handlers (GET, POST, PUT) for Inngest |
// | `checkBudgetAlerts`  | The scheduled job function, registered with Inngest       |
// | Cron `"0 */6 * * *"` | Tells Inngest to invoke this function every 6 hours       |
// | Inngest platform     | Sends a POST request to your app’s `/api/inngest`         |
// | Your API route       | Receives request → calls `checkBudgetAlerts()`            |
