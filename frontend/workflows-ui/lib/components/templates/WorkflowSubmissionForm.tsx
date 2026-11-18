import { JsonForms } from "@jsonforms/react";
import { createAjv, JsonSchema, UISchemaElement } from "@jsonforms/core";
import { useState } from "react";
import { JSONObject } from "../../types";
import { rendererSet } from "../../utils/jsonforms/renderers";
import { materialCells } from "@jsonforms/material-renderers";
import { ErrorObject } from "ajv";
import {
  Visit as Session,
  VisitInput as SessionInput,
} from "@diamondlightsource/sci-react-ui";
import { Box, Button, Divider, Stack, useTheme } from "@mui/material";

interface WorkflowSubmissionFormProps {
  //** The name of the workflow template */
  name: string;
  //** A JSON Schema describing the arguments of a workflow template */
  args: JsonSchema;
  /** A JSON Forms UI Schema describing how to render the arguments of the Workflow Template */
  uiSchema?: UISchemaElement;
  /** The session to submit the workflow to. If not provided, a session input is displayed */
  session?: Session;
  /** Function that is executed when the submit button is pressed */
  onSubmit: (
    name: string,
    session: Session,
    parameters: object,
  ) => Promise<void>;
}

export function WorkflowSubmissionForm({
  name,
  args,
  uiSchema,
  session,
  onSubmit,
}: WorkflowSubmissionFormProps) {
  const [parameters, setParameters] = useState<object>({});
  const [errors, setErrors] = useState<ErrorObject[]>([]);
  const validator = createAjv({ useDefaults: true, coerceTypes: true });
  const theme = useTheme();

  const onClick = (name: string, session: Session, parameters: object) => {
    if (errors.length === 0) {
      void onSubmit(name, session, parameters);
    }
  };

  return (
    <Stack spacing={theme.spacing(2)}>
      <JsonForms
        schema={args}
        uischema={uiSchema ?? undefined}
        data={parameters}
        renderers={rendererSet}
        cells={materialCells}
        ajv={validator}
        onChange={({ data, errors }) => {
          setParameters(data as JSONObject);
          setErrors(errors ? errors : []);
        }}
      />
      <Divider />
      {session ? (
        <Box alignContent={"end"} alignSelf={"end"}>
          <Button
            onClick={() => {
              onClick(name, session, parameters);
            }}
            variant="contained"
            color="primary"
          >
            Submit
          </Button>
        </Box>
      ) : (
        <SessionInput
          onSubmit={(session) => {
            onClick(name, session, parameters);
          }}
        />
      )}
    </Stack>
  );
}
