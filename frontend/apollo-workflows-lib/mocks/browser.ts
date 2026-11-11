import { setupWorker } from "msw/browser";
import { handlers } from "../tests/mocks/handlers";

export const worker = setupWorker(...handlers);
