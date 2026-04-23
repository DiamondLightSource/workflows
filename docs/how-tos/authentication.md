# Authentication

Workflows uses [Keycloak](https://dev-guide.diamond.ac.uk/authn/how-tos/request-a-registration-with-keycloak/) for authentication.

# Developer Instructions

## How to Set up a Keycloak Client to work with Workflows via the Graph

When you [request a Keycloak client](https://jira.diamond.ac.uk/servicedesk/customer/portal/5/create/176), **you must ask for**:

- **Audience:** `graph`

When you use the client to **acquire an access token**, **you must request**:

- **Scope:** `posix-uid`

### What these mean

- **Audience (`graph`)**: tells Keycloak to issue a token intended for _The Graph_. Without this, Workflows may reject the token as "not meant for me".
- **Scope (`posix-uid`)**: tells Keycloak to include the POSIX user identity information Workflows expects to see in the token. Without this, you may be unable to submit jobs.

If you have authentication problems, contact the Diamond Workflows Slack channel:
[#workflows](https://diamondlightsource.slack.com/archives/C08NYJSGMFD)
