// @ts-ignore
import { serve } from "https://esm.sh/inngest@3.26.0/edge?target=deno";
import { inngest } from "./client.ts";
import { generatePack } from "./generate-pack.ts";

export default serve({
  client: inngest,
  functions: [
    generatePack
  ],
});
