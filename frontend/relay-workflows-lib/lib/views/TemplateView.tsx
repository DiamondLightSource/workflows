import { useState } from "react";
import { useLazyLoadQuery, useMutation } from "react-relay/hooks";
import { graphql } from "relay-runtime";
import { Box } from "@mui/material";
import { SubmissionData, Visit } from "workflows-lib";
import { visitToText } from "@diamondlightsource/sci-react-ui";
import SubmissionForm from "../components/SubmissionForm";
import SubmittedMessagesList from "workflows-lib/lib/components/workflow/SubmittedMessagesList";
import { visitTextToVisit } from "workflows-lib/lib/utils/commonUtils";
import { TemplateViewMutation } from "./__generated__/TemplateViewMutation.graphql";
import { TemplateViewQuery as TemplateViewQueryType } from "./__generated__/TemplateViewQuery.graphql";
import { SubmissionFormParametersFragment$key } from "../components/__generated__/SubmissionFormParametersFragment.graphql";

export const TemplateViewQuery = graphql`
  query TemplateViewQuery($templateName: String!) {
    workflowTemplate(name: $templateName) {
      ...SubmissionFormFragment
    }
  }
`;

const mutation = graphql`
  mutation TemplateViewMutation(
    $templateName: String!
    $visit: VisitInput!
    $parameters: JSON!
  ) {
    submitWorkflowTemplate(
      name: $templateName
      visit: $visit
      parameters: $parameters
    ) {
      name
    }
  }
`;

export default function TemplateView({
  templateName,
  visit,
  prepopulatedParameters,
  workflowName,
}: {
  templateName: string;
  visit?: Visit;
  prepopulatedParameters?: SubmissionFormParametersFragment$key;
  workflowName?: string;
}) {
  const storedVisit = visitTextToVisit(
    localStorage.getItem("instrumentSessionID") ?? "",
  );
  const [submissionData, setSubmissionData] = useState<SubmissionData[]>([]);
  const [commitMutation] = useMutation<TemplateViewMutation>(mutation);
  const templateData = useLazyLoadQuery<TemplateViewQueryType>(
    TemplateViewQuery,
    { templateName },
    { fetchPolicy: "store-or-network" },
  );
  function submitWorkflow(visit: Visit, parameters: object) {
    commitMutation({
      variables: { templateName, visit, parameters },
      onCompleted: (response, errors) => {
        if (errors?.length) {
          setSubmissionData((prev) => [
            { submissionResult: { type: "graphQLError", errors }, visit },
            ...prev,
          ]);
        } else {
          const submittedName = response.submitWorkflowTemplate.name;
          setSubmissionData((prev) => [
            {
              submissionResult: {
                type: "success",
                message: `${visitToText(visit)}/${submittedName}`,
              },
              visit,
              workflowName: submittedName,
            },
            ...prev,
          ]);
          localStorage.setItem("instrumentSessionID", visitToText(visit));
        }
      },
      onError: (err) => {
        setSubmissionData((prev) => [
          { submissionResult: { type: "networkError", error: err }, visit },
          ...prev,
        ]);
      },
    });
  }

  return (
    <Box>
      <SubmissionForm
        template={templateData.workflowTemplate}
        prepopulatedParameters={prepopulatedParameters}
        visit={visit ?? storedVisit ?? undefined}
        onSubmit={submitWorkflow}
        workflowName={workflowName}
      />
      <Box sx={{ width: { xs: "100%", sm: "100%", md: "800px" } }}>
        <SubmittedMessagesList submittedData={submissionData} />
      </Box>
    </Box>
  );
}
