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

const argoCard = (
  <React.Fragment>
    <CardActionArea
      href="https:///argo-workflows.workflows.diamond.ac.uk"
      target="_blank"
    >
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Argo Web UI
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          The native Argo Workflows dashboard.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

const grafanaCard = (
  <React.Fragment>
    <CardActionArea
      href="https://grafana.workflows.diamond.ac.uk"
      target="_blank"
    >
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Grafana
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Provides visualization for workflows metrics.
        </Typography>
      </CardContent>
    </CardActionArea>
  </React.Fragment>
);

const argoCdCard = (
  <React.Fragment>
    <CardActionArea
      href="https://argo-cd.workflows.diamond.ac.uk"
      target="_blank"
    >
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          ArgoCD
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Monitors deployments of services and workflow templates.
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
            <Card style={{ height: "100%" }}>{workflowsCard}</Card>
          </Grid>
          <Grid key={"templates"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{templatesCard}</Card>
          </Grid>
          <Grid key={"documentation"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{documentationCard}</Card>
          </Grid>
          <Grid key={"argo"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{argoCard}</Card>
          </Grid>
          <Grid key={"grafana"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{grafanaCard}</Card>
          </Grid>
          <Grid key={"argocd"} size={{ xs: 2, sm: 2, md: 3 }}>
            <Card style={{ height: "100%" }}>{argoCdCard}</Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default DashboardPage;
