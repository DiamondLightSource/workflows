# SessionSpaces

A Namespace Controller for the virtual cluster performs several critical tasks to ensure efficient and organized management of namespaces. Specifically, it:

* Creates a cluster-wide role for Argo Workflows and a visit-member.
* Queries the ISPyB database tables, including BLsessions, Proposal, and Persons.
* Creates, deletes, or updates namespaces with the session names derived from the ISPyB tables.
* Creates service accounts and role bindings for each namespace.
* Updates the service accounts with the appropriate visit members.

These operations are executed periodically to maintain an up-to-date session namespaces within the virtual cluster.