
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { visitTextToVisit } from "workflows-lib";

import WorkflowsNavbar from "relay-workflows-lib/lib/components/WorkflowsNavbar";

const APOLLO_WORKFLOWS_QUERY = gql`
  query ApolloWorkflowsTest(
    $visit: VisitInput!
    $limit: Int
    $cursor: String
    $filter: WorkflowFilter
  ) {
    workflows(
      visit: $visit
      limit: $limit
      cursor: $cursor
      filter: $filter
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }

      nodes {
        name
        id

        visit {
          proposalCode
          proposalNumber
          number
        }

        creator {
          creatorId
        }

        status {
          __typename

          ... on WorkflowRunningStatus {
            startTime
            tasks {
              id
              name
              status
              depends
              stepType
              artifacts {
                name
                url
                mimeType
              }
            }
          }

          ... on WorkflowSucceededStatus {
            startTime
            tasks {
              id
              name
              status
              depends
              stepType
              artifacts {
                name
                url
                mimeType
              }
            }
          }

          ... on WorkflowFailedStatus {
            startTime
            tasks {
              id
              name
              status
              depends
              stepType
              artifacts {
                name
                url
                mimeType
              }
            }
          }

          ... on WorkflowErroredStatus {
            startTime
            tasks {
              id
              name
              status
              depends
              stepType
              artifacts {
                name
                url
                mimeType
              }
            }
          }
        }
      }
    }
  }
`;

type WorkflowStatus =
  | "WorkflowRunningStatus"
  | "WorkflowSucceededStatus"
  | "WorkflowFailedStatus"
  | "WorkflowErroredStatus";

type WorkflowTask = {
  id: string;
  name: string;
  status: string;
  depends?: string[];
  stepType?: string;
  artifacts?: {
    name: string;
    url: string;
    mimeType: string;
  }[];
};

type Workflow = {
  id: string;
  name: string;
  creator?: {
    creatorId?: string;
  };
  visit?: {
    proposalCode?: string;
    proposalNumber?: number;
    number?: number;
  };
  status?: {
    __typename?: WorkflowStatus;
    startTime?: string;
    tasks?: WorkflowTask[];
  };
};

type WorkflowsQueryResult = {
  workflows: {
    nodes: Workflow[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

const statusLabel = (status?: string) => {
  switch (status) {
    case "WorkflowRunningStatus":
      return "Running";
    case "WorkflowSucceededStatus":
      return "Succeeded";
    case "WorkflowFailedStatus":
      return "Failed";
    case "WorkflowErroredStatus":
      return "Errored";
    default:
      return "Unknown";
  }
};

const statusColor = (status?: string) => {
  switch (status) {
    case "WorkflowRunningStatus":
      return "#2563eb";
    case "WorkflowSucceededStatus":
      return "#15803d";
    case "WorkflowFailedStatus":
      return "#dc2626";
    case "WorkflowErroredStatus":
      return "#9333ea";
    default:
      return "#64748b";
  }
};

const formatDate = (date?: string) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString();
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "32px",
    fontFamily: "Inter, Arial, sans-serif",
    color: "#1e293b",
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 30,
  } as React.CSSProperties,

  title: {
    fontSize: 30,
    fontWeight: 700,
    margin: 0,
    color: "#0f172a",
  } as React.CSSProperties,

  subtitle: {
    color: "#64748b",
    marginTop: 8,
    fontSize: 14,
  } as React.CSSProperties,

  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 2px 8px rgba(15,23,42,0.03)",
  } as React.CSSProperties,

  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  } as React.CSSProperties,

  input: {
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#ffffff",
    fontSize: 14,
    color: "#334155",
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 950,
  } as React.CSSProperties,

  th: {
    textAlign: "left",
    padding: "16px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#64748b",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",

    position: "sticky",
    top: 0,
    zIndex: 2,
  } as React.CSSProperties,

  td: {
    padding: "16px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: 13,
    verticalAlign: "middle",
  } as React.CSSProperties,
};

export default function ApolloWorkflowTest() {
  const visitId = localStorage.getItem("instrumentSessionID");
  const visit = visitTextToVisit(visitId ?? undefined);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DATE_DESC");

  const {
    loading,
    error,
    data,
    fetchMore,
  } = useQuery<WorkflowsQueryResult>(
    APOLLO_WORKFLOWS_QUERY,
    {
      variables: {
        visit,
        limit: 10,
        cursor: null,
        filter: null,
      },
      skip: !visit,
      pollInterval: 0,
    },
  );

  if (!visit) {
    return (
      <>
        <WorkflowsNavbar />

        <div style={styles.page}>
          <div style={styles.card}>
            No valid visit found. Open a workflow visit first.
          </div>
        </div>
      </>
    );
  }

  if (loading && !data) {
    return (
      <>
        <WorkflowsNavbar />

        <div style={styles.page}>
          <div style={styles.card}>
            Loading workflows from Apollo...
          </div>
        </div>
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        <WorkflowsNavbar />

        <div style={styles.page}>
          <div style={styles.card}>
            <pre>{error.message}</pre>
          </div>
        </div>
      </>
    );
  }

  const workflows = data?.workflows?.nodes ?? [];
  const pageInfo = data?.workflows?.pageInfo;

  // Summary cards use currently loaded workflows.

  const runningCount = workflows.filter(
    (w) => w.status?.__typename === "WorkflowRunningStatus",
  ).length;

  const succeededCount = workflows.filter(
    (w) => w.status?.__typename === "WorkflowSucceededStatus",
  ).length;

  const failedCount = workflows.filter(
    (w) => w.status?.__typename === "WorkflowFailedStatus",
  ).length;

  const erroredCount = workflows.filter(
    (w) => w.status?.__typename === "WorkflowErroredStatus",
  ).length;

  // Local search and status filtering.

  const filteredWorkflows = workflows.filter((workflow) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      workflow.name.toLowerCase().includes(searchText) ||
      workflow.id.toLowerCase().includes(searchText) ||
      workflow.creator?.creatorId
        ?.toLowerCase()
        .includes(searchText);

    const matchesStatus =
      statusFilter === "ALL" ||
      workflow.status?.__typename === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Local sorting.

  const sortedWorkflows = [...filteredWorkflows].sort((a, b) => {
    switch (sortBy) {
      case "NAME_ASC":
        return a.name.localeCompare(b.name);

      case "NAME_DESC":
        return b.name.localeCompare(a.name);

      case "DATE_ASC":
        return (
          new Date(a.status?.startTime ?? 0).getTime() -
          new Date(b.status?.startTime ?? 0).getTime()
        );

      case "DATE_DESC":
      default:
        return (
          new Date(b.status?.startTime ?? 0).getTime() -
          new Date(a.status?.startTime ?? 0).getTime()
        );
    }
  });

  // Existing Apollo pagination remains intact.

  const loadNextPage = async () => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) {
      return;
    }

    try {
      await fetchMore({
        variables: {
          visit,
          limit: 10,
          cursor: pageInfo.endCursor,
          filter: null,
        },

        updateQuery: (
          previousResult,
          { fetchMoreResult },
        ) => {
          if (!fetchMoreResult) {
            return previousResult;
          }

          return {
            ...fetchMoreResult,

            workflows: {
              ...fetchMoreResult.workflows,

              nodes: [
                ...previousResult.workflows.nodes,
                ...fetchMoreResult.workflows.nodes,
              ],
            },
          };
        },
      });
    } catch (err) {
      console.error("Failed to load next page:", err);
    }
  };

  const summaryCards = [
    {
      label: "Total Workflows",
      count: workflows.length,
      color: "#334155",
    },
    {
      label: "Running",
      count: runningCount,
      color: "#2563eb",
    },
    {
      label: "Succeeded",
      count: succeededCount,
      color: "#15803d",
    },
    {
      label: "Failed / Errored",
      count: failedCount + erroredCount,
      color: "#dc2626",
    },
  ];

  return (
    <>
      <WorkflowsNavbar />

      <div style={styles.page}>
        {/* HEADER */}

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Workflow Dashboard  (POC Apollo Client)
          </h1>

          <p style={styles.subtitle}>
            Monitor, search and inspect your Apollo workflows.
          </p>
        </div>

        <div
          style={{
            ...styles.card,
            padding: "14px 20px",
            minWidth: 180,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Active Visit
          </div>

          <strong style={{ fontSize: 16 }}>
            {visitId ?? "Unknown"}
          </strong>
        </div>
      </header>

      {/* SUMMARY CARDS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {summaryCards.map((item) => (
          <div
            key={item.label}
            style={styles.card}
          >
            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                marginBottom: 12,
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: item.color,
              }}
            >
              {item.count}
            </div>
          </div>
        ))}
      </div>

      {/* WORKFLOW TABLE */}

      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                color: "#0f172a",
              }}
            >
              Submitted Workflows
            </h2>

            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                marginTop: 6,
              }}
            >
              {sortedWorkflows.length} matching workflows
              {" · "}
              {workflows.length} loaded
            </p>
          </div>
        </div>

        {/* TOOLBAR */}

        <div style={styles.toolbar}>
          <input
            type="text"
            placeholder="Search workflow, creator or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              ...styles.input,
              flex: 1,
              minWidth: 220,
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            style={styles.input}
          >
            <option value="ALL">All statuses</option>
            <option value="WorkflowRunningStatus">
              Running
            </option>
            <option value="WorkflowSucceededStatus">
              Succeeded
            </option>
            <option value="WorkflowFailedStatus">
              Failed
            </option>
            <option value="WorkflowErroredStatus">
              Errored
            </option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.input}
          >
            <option value="DATE_DESC">
              Newest first
            </option>
            <option value="DATE_ASC">
              Oldest first
            </option>
            <option value="NAME_ASC">
              Name A-Z
            </option>
            <option value="NAME_DESC">
              Name Z-A
            </option>
          </select>
        </div>

        {/* TABLE */}

        <div
          style={{
            overflow: "auto",
            maxHeight: "calc(100vh - 300px)",
          }}
        >
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Workflow</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Creator</th>
                <th style={styles.th}>Visit</th>
                <th style={styles.th}>Started</th>
                <th style={styles.th}>Tasks</th>
                <th style={styles.th}>Details</th>
              </tr>
            </thead>

            <tbody>
              {sortedWorkflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td style={styles.td}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                    >
                      {workflow.name}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 5,
                      }}
                    >
                      {workflow.id}
                    </div>
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "5px 10px",
                        borderRadius: 20,
                        background: `${statusColor(
                          workflow.status?.__typename,
                        )}15`,
                        color: statusColor(
                          workflow.status?.__typename,
                        ),
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {statusLabel(
                        workflow.status?.__typename,
                      )}
                    </span>
                  </td>

                  <td style={styles.td}>
                    {workflow.creator?.creatorId ?? "—"}
                  </td>

                  <td style={styles.td}>
                    {workflow.visit?.proposalCode}
                    {workflow.visit?.proposalNumber}-
                    {workflow.visit?.number}
                  </td>

                  <td style={styles.td}>
                    {formatDate(
                      workflow.status?.startTime,
                    )}
                  </td>

                  <td style={styles.td}>
                    {workflow.status?.tasks?.length ?? 0}
                  </td>

                  <td style={styles.td}>
                    <details>
                      <summary
                        style={{
                          cursor: "pointer",
                          color: "#2563eb",
                          fontWeight: 600,
                        }}
                      >
                        View tasks
                      </summary>

                      <div
                        style={{
                          minWidth: 260,
                          padding: 10,
                        }}
                      >
                        {workflow.status?.tasks?.map(
                          (task) => (
                            <div
                              key={task.id}
                              style={{
                                padding: 12,
                                marginBottom: 8,
                                borderRadius: 8,
                                background: "#f8fafc",
                                border:
                                  "1px solid #e2e8f0",
                              }}
                            >
                              <strong>
                                {task.name}
                              </strong>

                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: 12,
                                  marginTop: 5,
                                }}
                              >
                                Status: {task.status}
                              </div>

                              {task.stepType && (
                                <div
                                  style={{
                                    color: "#64748b",
                                    fontSize: 12,
                                  }}
                                >
                                  Type: {task.stepType}
                                </div>
                              )}

                              {task.artifacts?.map(
                                (artifact) => (
                                  <div
                                    key={artifact.url}
                                    style={{
                                      marginTop: 8,
                                    }}
                                  >
                                    <a
                                      href={artifact.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        color: "#2563eb",
                                        fontSize: 12,
                                      }}
                                    >
                                      {artifact.name}
                                    </a>
                                  </div>
                                ),
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}

              {sortedWorkflows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...styles.td,
                      textAlign: "center",
                      padding: 40,
                      color: "#64748b",
                    }}
                  >
                    No workflows match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 24,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "#64748b",
            }}
          >
            {workflows.length} workflows loaded
          </span>

          {pageInfo?.hasNextPage && (
            <button
              onClick={loadNextPage}
              disabled={loading}
              style={{
                padding: "12px 24px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? "Loading..."
                : "Load More Workflows"}
            </button>
          )}

          {!pageInfo?.hasNextPage &&
            workflows.length > 0 && (
              <span
                style={{
                  fontSize: 13,
                  color: "#15803d",
                  fontWeight: 600,
                }}
              >
                All workflows loaded
              </span>
            )}
        </div>
      </div>
    </div>
    </>
    );
  }