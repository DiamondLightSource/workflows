import React from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import { graphql } from "relay-runtime";
import { RetriggerWorkflowQuery as RetriggerWorkflowQueryType } from "./__generated__/RetriggerWorkflowQuery.graphql";
import { Visit } from "@diamondlightsource/sci-react-ui";

import { useLazyLoadQuery } from "react-relay/hooks";
import { NavLink } from "react-router-dom";
import { visitToText } from "workflows-lib/lib/utils/commonUtils";
import Tooltip from "@mui/material/Tooltip";

const retriggerWorkflowQuery = graphql`
  query RetriggerWorkflowQuery($visit: VisitInput!, $workflowname: String!) {
    workflow(visit: $visit, name: $workflowname) {
      templateRef
    }
  }
`;
interface RetriggerWorkflowProps {
  instrumentSession: Visit;
  workflowName: string;
}

const RetriggerWorkflow: React.FC<RetriggerWorkflowProps> = ({
  instrumentSession,
  workflowName,
}) => {
  const data = useLazyLoadQuery<RetriggerWorkflowQueryType>(
    retriggerWorkflowQuery,
    {
      visit: instrumentSession,
      workflowname: workflowName,
    },
  );
  const templateName = data.workflow.templateRef;
  return (
    <>
      {templateName ? (
        <NavLink
          title="Rerun workflow"
          to={`/templates/${data.workflow.templateRef}/${visitToText(
            instrumentSession,
          )}-${workflowName}`}
        >
          <RefreshIcon />
        </NavLink>
      ) : (
        <Tooltip title="No template found">
          <RefreshIcon sx={{ color: "lightgrey" }} />
        </Tooltip>
      )}
    </>
  );
};

export default RetriggerWorkflow;
