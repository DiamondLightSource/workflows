import Keycloak from "keycloak-js";

//Keycloak init options
const initOptions = {
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
};

const keycloak = new Keycloak(initOptions);

export default keycloak;
