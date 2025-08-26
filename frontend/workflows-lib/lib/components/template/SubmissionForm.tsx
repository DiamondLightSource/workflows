import { materialCells } from "@jsonforms/material-renderers";
import { JsonSchema, UISchemaElement, createAjv } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import React, { useState } from "react";
import { Divider, Snackbar, Stack, Typography, useTheme } from "@mui/material";
import { ErrorObject } from "ajv";
import { JSONObject, Visit } from "../../types";
import { VisitInput } from "@diamondlightsource/sci-react-ui";
import { rendererSet } from "../../utils/renderers";

interface TemplateSubmissionFormProps {
  title: string;
  maintainer: string;
  repository?: string | null;
  description?: string;
  parametersSchema: JsonSchema;
  parametersUISchema?: UISchemaElement;
  prepopulatedParameters?: JSONObject;
  visit?: Visit;
  onSubmit: (visit: Visit, parameters: object) => void;
}

const TemplateSubmissionForm: React.FC<TemplateSubmissionFormProps> = ({
  title,
  maintainer,
  repository,
  description,
  parametersSchema,
  parametersUISchema,
  prepopulatedParameters,
  visit,
  onSubmit,
}) => {
  const theme = useTheme();
  const validator = createAjv({ useDefaults: true, coerceTypes: true });

  const [parameters, setParameters] = useState(prepopulatedParameters ?? {});
  const [errors, setErrors] = useState<ErrorObject[]>([]);

  const [submitted, setSubmitted] = useState(false);

  const onClick = (visit: Visit, parameters?: object) => {
    if (errors.length === 0) {
      onSubmit(visit, parameters ?? {});
      setSubmitted(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSubmitted(false);
  };
  const formWidth =
    (parametersUISchema?.options?.formWidth as string | undefined) ?? "100%";

  return (
    <Stack
      direction="column"
      spacing={theme.spacing(2)}
      sx={{ width: formWidth }}
    >
      <Typography variant="h4" align="center">
        {title}
      </Typography>
      <Typography variant="body1" align="center">
        {description}
      </Typography>
      <Typography variant="body1" align="center">
        Maintainer: {maintainer}
      </Typography>
      {repository && (
        <Typography variant="body1" align="center">
          Repository: {repository}
        </Typography>
      )}
      <Divider />
      <JsonForms
        schema={parametersSchema}
        uischema={parametersUISchema ?? undefined}
        data={parameters}
        renderers={rendererSet}
        cells={materialCells}
        ajv={validator}
        onChange={({ data, errors }) => {
          setParameters(data as JSONObject);
          setErrors(errors ? errors : []);
        }}
        data-testid="paramters-form"
      />
      <Divider />
      <VisitInput
        visit={visit}
        onSubmit={onClick}
        parameters={parameters}
        submitOnReturn={false}
      ></VisitInput>
      <Snackbar
        open={submitted}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Workflow submitted!"
      />
    </Stack>
  );
};

export default TemplateSubmissionForm;
