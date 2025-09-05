import { useState } from "react";
import { useLazyLoadQuery, useMutation } from "react-relay/hooks";
import { graphql } from "relay-runtime";
import { Box } from "@mui/material";
import { JSONObject, SubmissionData, Visit } from "workflows-lib";
import { visitToText } from "@diamondlightsource/sci-react-ui";
import SubmissionForm from "./SubmissionForm";
import { TemplateViewQuery as TemplateViewQueryType } from "./__generated__/TemplateViewQuery.graphql";
import { TemplateViewMutation as TemplateViewMutationType } from "./__generated__/TemplateViewMutation.graphql";
import { visitTextToVisit } from "workflows-lib/lib/utils/commonUtils";
import SubmittedMessagesList from "./SubmittedMessagesList";

const templateViewQuery = graphql`
  query TemplateViewQuery($templateName: String!) {
    workflowTemplate(name: $templateName) {
      ...workflowTemplateFragment
    }
  }
`;

const templateViewMutation = graphql`
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
}: {
  templateName: string;
  visit?: Visit;
  prepopulatedParameters?: JSONObject;
}) {
  const data = useLazyLoadQuery<TemplateViewQueryType>(templateViewQuery, {
    templateName,
  });

  const storedVisit = visitTextToVisit(
    localStorage.getItem("instrumentSessionID") ?? "",
  );

  const [submissionData, setSubmissionData] = useState<SubmissionData[]>([]);

  const [commitMutation] =
    useMutation<TemplateViewMutationType>(templateViewMutation);

  function submitWorkflow(visit: Visit, parameters: object) {
    commitMutation({
      variables: {
        templateName: templateName,
        visit: visit,
        parameters: parameters,
      },
      onCompleted: (response, errors) => {
        if (errors?.length) {
          console.error("GraphQL errors:", errors);
          setSubmissionData((prev) => [
            {
              submissionResult: {
                type: "graphQLError",
                errors: errors,
              },
              visit: visit,
            },
            ...prev,
          ]);
        } else {
          const submittedName = response.submitWorkflowTemplate.name;
          console.log("Successfully submitted:", submittedName);
          setSubmissionData((prev) => [
            {
              submissionResult: {
                type: "success",
                message: `${visitToText(visit)}/${submittedName}`,
              },
              visit: visit,
              workflowName: submittedName,
            },
            ...prev,
          ]);
          localStorage.setItem("instrumentSessionID", visitToText(visit));
        }
      },
      onError: (err) => {
        console.error("Submission failed:", err);
        setSubmissionData((prev) => [
          {
            submissionResult: {
              type: "networkError",
              error: err,
            },
            visit: visit,
          },
          ...prev,
        ]);
      },
    });
  }
  return (
    <>
      {templateName ? (
        <Box>
          <SubmissionForm
            template={data.workflowTemplate}
            prepopulatedParameters={prepopulatedParameters}
            visit={visit ?? storedVisit ?? undefined}
            onSubmit={submitWorkflow}
          />
          <Box
            sx={{
              width: {
                xs: "100%",
                sm: "100%",
                md: "800px",
              },
            }}
          >
            <SubmittedMessagesList submittedData={submissionData} />
          </Box>
        </Box>
      ) : (
        <>No Template Name provided</>
      )}
    </>
  );
}
