import { Container, Box } from "@mui/material";
import Workflows from "../components/Workflows";
import { Visit } from "workflows-lib";
import { VisitInput } from "@diamondlightsource/sci-react-ui";
import { useState } from "react";

function WorkflowsList() {
  const [visit, setVisit] = useState<Visit>({
    proposalCode: "mg",
    proposalNumber: 36964,
    number: 1,
  } as Visit);
  return (
    <>
      <Container maxWidth="sm">
        <Box display="flex" flexDirection="column" alignItems="center" marginTop="20px">
          <Box width="100%" mb={2}>
            <VisitInput onSubmit={setVisit} visit={visit}></VisitInput>
          </Box>
          <Box width="100%">
            <Workflows visit={visit} />
          </Box>
        </Box>
      </Container>
    </>
  );
}

export default WorkflowsList;
