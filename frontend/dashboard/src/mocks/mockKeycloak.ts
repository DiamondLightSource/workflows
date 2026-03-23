const createMockJwt = (payload: object) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
};

const mockToken = createMockJwt({
  sub: "mock-user",
  preferred_username: "mockuser",
  email: "mock@diamond.ac.uk",
  exp: Number.MAX_SAFE_INTEGER,
  iat: Number.MIN_SAFE_INTEGER,
  iss: "https://authn.diamond.ac.uk/realms/master",
});

const mockKeycloak = {
  init: () => Promise.resolve(true),
  authenticated: true,
  token: mockToken,
  updateToken: () => Promise.resolve(true),
  onTokenExpired: () => {},
};

export default mockKeycloak;
