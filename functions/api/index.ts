
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serve as inngestServe } from "https://esm.sh/inngest@3.26.0";
import { generatePack } from "./generate-pack.ts";

// Create an Inngest client
export const inngest = { id: "promptcore-app" };

// Serve the Inngest functions
const handler = inngestServe({
  client: inngest,
  functions: [generatePack],
});

serve(handler);
