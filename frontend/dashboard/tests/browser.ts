import { setupWorker } from "msw/browser";
//import { handlers } from "relay-workflows-lib";
import { handlers } from "../../relay-workflows-lib/tests/mocks/handlers";

export const worker = setupWorker(...handlers);
