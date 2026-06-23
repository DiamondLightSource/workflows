import { setupWorker } from "msw/browser";
import { handlers } from "relay-workflows-lib";

export const worker = setupWorker(...handlers);
