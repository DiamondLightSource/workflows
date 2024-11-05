import {
  materialCells,
  materialRenderers,
} from "@jsonforms/material-renderers";
import { JsonSchema, UISchemaElement, createAjv } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import React, { ChangeEvent, useState } from "react";
import {
  Button,
  Divider,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { ErrorObject } from "ajv";
import { Visit } from "../../types";

interface TemplateSubmissionFormProps {
  title: string;
  description?: string;
  parametersSchema: JsonSchema;
  parametersUISchema?: UISchemaElement;
  visit?: Visit;
  onSubmit?: (visit: Visit, parameters: object) => void;
}

const visitRegex = /^([a-z]{2})([1-9]\d*)-([1-9]\d*)/;

const TemplateSubmissionForm: React.FC<TemplateSubmissionFormProps> = ({
  title,
  description,
  parametersSchema,
  parametersUISchema,
  visit,
  onSubmit,
}) => {
  const theme = useTheme();
  const validator = createAjv({ useDefaults: true });
  const [parameters, setParameters] = useState({});
  const [errors, setErrors] = useState<ErrorObject[]>([]);
  const [visitText, setVisitText] = useState(
    visit
      ? `${visit.proposalCode}${visit.proposalNumber.toFixed(
          0
        )}-${visit.number.toFixed(0)}`
      : ""
  );

  const ready = errors.length === 0 && visitRegex.exec(visitText) !== null;

  const onClickSubmit = () => {
    const parsedVisit = visitRegex.exec(visitText);
    if (parsedVisit === null) return;
    onSubmit?.(
      {
        proposalCode: parsedVisit[1],
        proposalNumber: Number(parsedVisit[2]),
        number: Number(parsedVisit[3]),
      },
      parameters
    );
  };

  return (
    <Stack direction="column" spacing={theme.spacing(2)}>
      <Typography variant="h2" align="center">
        {title}
      </Typography>
      <Typography variant="body1" align="center">
        {description}
      </Typography>
      <Divider />
      <JsonForms
        schema={parametersSchema}
        uischema={parametersUISchema}
        data={parameters}
        renderers={materialRenderers}
        cells={materialCells}
        ajv={validator}
        onChange={({ data, errors }) => {
          setParameters(data as object);
          setErrors(errors ? errors : []);
        }}
        data-testid="paramters-form"
      />
      <Divider />
      <Stack
        direction="row"
        alignContent="end"
        spacing={theme.spacing(1)}
        alignSelf="end"
      >
        <TextField
          label="Visit"
          value={visitText}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setVisitText(event.target.value);
          }}
          data-testid="visit-field"
        />
        <Button
          variant="contained"
          disabled={!ready}
          onClick={onClickSubmit}
          data-testid="submit-button"
        >
          {" "}
          Submit
        </Button>
      </Stack>
    </Stack>
  );
};

export default TemplateSubmissionForm;
