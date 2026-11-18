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

interface WorkflowSubmitterProps {
  name: string;
  args: JsonSchema;
  uiSchema?: UISchemaElement;
  session?: Session;
  onSubmit?: (
    name: string,
    session: Session,
    parameters: object,
  ) => Promise<void>;
}

export function WorkflowSubmitter({
  name,
  args,
  uiSchema,
  session,
  onSubmit,
}: WorkflowSubmitterProps) {
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
