import { setupServer } from "msw/node";
import { handlers } from "dashboard/src/mocks/handlers";

export const serviceWorker = setupServer(...handlers);
