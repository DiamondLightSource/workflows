import {
  Container,
  Grid2 as Grid,
  Card,
  CardContent,
  Typography,
  CardActionArea,
} from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { WorkflowsNavbar } from "workflows-lib";

const workflowsCard = (
  <React.Fragment>
    <CardActionArea component={Link} to="/workflows">
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Workflows
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Provides an overview of current and past workflows for a given visit.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

const templatesCard = (
  <React.Fragment>
    <CardActionArea component={Link} to="/templates">
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Templates
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Provides an overview of all available workflowTemplates and Sensors.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

const documentationCard = (
  <React.Fragment>
    <CardActionArea
      href="https://diamondlightsource.github.io/workflows/docs"
      target="_blank"
    >
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Documentation
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Full user documentation with tutorials, how-tos, explanations and
          references.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

const helpCard = (
  <React.Fragment>
    <CardActionArea
      href="https://diamondlightsource.slack.com/archives/C08NYJSGMFD"
      target="_blank"
    >
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Help/Feedback
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Get help from the workflows team and leave feedback.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

const reportCard = (
  <React.Fragment>
    <CardActionArea
      href="https://github.com/DiamondLightSource/workflows/issues/new"
      target="_blank"
    >
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Report an issue
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Report an issue on the workflows GitHub page.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

function DashboardPage() {
  return (
    <>
      <WorkflowsNavbar />
      <Container maxWidth="sm" sx={{ mt: 5, mb: 4 }}>
        <Grid
          container
          alignItems="stretch"
          spacing={{ xs: 2, sm: 2, md: 3 }}
          columns={{ xs: 2, sm: 4, md: 6 }}
        >
          <Grid key={"workflows"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%", minHeight: 150 }}>
              {workflowsCard}
            </Card>
          </Grid>
          <Grid key={"templates"} size={{ xs: 2, sm: 4, md: 3 }}>
            <Card style={{ height: "100%", minHeight: 150 }}>
              {templatesCard}
            </Card>
          </Grid>
          <Grid key={"documentation"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%", minHeight: 150 }}>
              {documentationCard}
            </Card>
          </Grid>
          <Grid key={"help"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%", minHeight: 150 }}>{helpCard}</Card>
          </Grid>
          <Grid key={"report"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%", minHeight: 150 }}>{reportCard}</Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default DashboardPage;
