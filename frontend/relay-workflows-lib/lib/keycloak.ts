import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "https://authn.diamond.ac.uk/",
  realm: "master",
  clientId: "workflows-cluster",
});

export default keycloak;
