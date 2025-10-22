import { setupServer } from "msw/node";
import { handlers } from "dashboard/src/mocks/handlers";

export const server = setupServer(...handlers);
