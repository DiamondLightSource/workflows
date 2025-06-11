import { useState } from "react";
import { useLazyLoadQuery, useMutation } from "react-relay/hooks";
import { graphql } from "relay-runtime";
import { Box } from "@mui/material";
import {
  JSONObject,
  SubmissionGraphQLErrorMessage,
  SubmissionNetworkErrorMessage,
  SubmissionSuccessMessage,
  SubmittedMessagesList,
  Visit,
} from "workflows-lib";
import { visitToText } from "@diamondlightsource/sci-react-ui";
import SubmissionForm from "./SubmissionForm";
import { TemplateViewQuery as TemplateViewQueryType } from "./__generated__/TemplateViewQuery.graphql";
import { TemplateViewMutation as TemplateViewMutationType } from "./__generated__/TemplateViewMutation.graphql";

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
  const [submissionResults, setSubmissionResults] = useState<
    (
      | SubmissionSuccessMessage
      | SubmissionNetworkErrorMessage
      | SubmissionGraphQLErrorMessage
    )[]
  >([]);

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
          setSubmissionResults((prev) => [
            {
              type: "graphQLError",
              errors: errors,
            },
            ...prev,
          ]);
        } else {
          const submittedName = response.submitWorkflowTemplate.name;
          console.log("Successfully submitted:", submittedName);
          setSubmissionResults((prev) => [
            {
              type: "success",
              message: `${visitToText(visit)}/${submittedName}`,
            },
            ...prev,
          ]);
        }
      },
      onError: (err) => {
        console.error("Submission failed:", err);
        setSubmissionResults((prev) => [
          {
            type: "networkError",
            error: err,
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
            visit={visit}
            onSubmit={submitWorkflow}
          />
          <SubmittedMessagesList submissionResults={submissionResults} />
        </Box>
      ) : (
        <>No Template Name provided</>
      )}
    </>
  );
}
