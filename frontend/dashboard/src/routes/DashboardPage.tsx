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

const cardHeight = 160;

const workflowsCard = (
  <React.Fragment>
    <CardActionArea component={Link} to="/workflows">
      <CardContent style={{ height: cardHeight }}>
        <Typography
          gutterBottom
          variant="h5"
          component="div"
          sx={{ textAlign: "center" }}
        >
          Submitted Workflows
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          View current and past workflows for a given visit.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

const templatesCard = (
  <React.Fragment>
    <CardActionArea component={Link} to="/templates">
      <CardContent style={{ height: cardHeight }}>
        <Typography
          gutterBottom
          variant="h5"
          component="div"
          sx={{ textAlign: "center" }}
        >
          Run New Workflow
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          Submit a new workflow from a template.
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
      <CardContent style={{ height: cardHeight }}>
        <Typography
          gutterBottom
          variant="h5"
          component="div"
          sx={{ textAlign: "center" }}
        >
          Documentation
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          Full user documentation with tutorials, explanations, how-tos, and
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
      <CardContent style={{ height: cardHeight }}>
        <Typography
          gutterBottom
          variant="h5"
          component="div"
          sx={{ textAlign: "center" }}
        >
          Help/Feedback
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          Get help and leave feedback via Slack.
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
      <CardContent style={{ height: cardHeight }}>
        <Typography
          gutterBottom
          variant="h5"
          component="div"
          sx={{ textAlign: "center" }}
        >
          Report an Issue
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          Report an issue via GitHub.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

function DashboardPage() {
  return (
    <>
      <WorkflowsNavbar />
      <Container maxWidth="lg" sx={{ mt: 5, mb: 4 }}>
        <Grid
          container
          alignItems="stretch"
          justifyContent="center"
          spacing={{ xs: 2, sm: 2, md: 3 }}
          columns={{ xs: 2, sm: 8, md: 12 }}
          sx={{ mt: 5, mb: 4 }}
        >
          <Grid key={"workflows"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{workflowsCard}</Card>
          </Grid>
          <Grid key={"templates"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card
              style={{ height: "100%" }}
              sx={{
                height: "100%",
                transition: "all 0.3s ease",
                "&:hover .card-description": {
                  opacity: 1,
                  maxHeight: 200,
                },
              }}
            >
              {templatesCard}
            </Card>
          </Grid>
        </Grid>
        <Grid
          container
          alignItems="stretch"
          justifyContent="center"
          spacing={{ xs: 2, sm: 2, md: 3 }}
          columns={{ xs: 2, sm: 8, md: 12 }}
          sx={{ mt: 5, mb: 4 }}
        >
          <Grid key={"documentation"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{documentationCard}</Card>
          </Grid>
          <Grid key={"help"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{helpCard}</Card>
          </Grid>
          <Grid key={"report"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{reportCard}</Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default DashboardPage;
