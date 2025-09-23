import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import React from "react";
import { Container, Box, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { graphql, useFragment } from "react-relay";
import type { TemplateCard_template$key } from "./__generated__/TemplateCard_template.graphql";

const templateCardFragment = graphql`
  fragment TemplateCard_template on WorkflowTemplate {
    name
    title
    description
    maintainer
    repository
  }
`;

export interface TemplateCardProps {
  template: TemplateCard_template$key;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  const data = useFragment(templateCardFragment, template);
  const location = useLocation();
  const navigate = useNavigate();
  const reroute = (templateName: string) => {
    const path = location.pathname.split("/")[1];
    (navigate(`/${path}/${templateName}`) as Promise<void>).catch(
      (error: unknown) => {
        console.error("Navigation error:", error);
      },
    );
  };
  return (
    <Container maxWidth="sm">
      <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
        <Card sx={{ width: { xs: "100%", lg: "900px" } }}>
          <CardActionArea
            onClick={() => {
              reroute(data.name);
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h5">
                    {data.title ?? data.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Maintainer: {data.maintainer}
                  </Typography>
                </Box>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography>{data.name}</Typography>
                  {data.repository && (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      Repository: {data.repository}
                    </Typography>
                  )}
                </Box>
                {data.description && (
                  <Typography variant="caption">{data.description}</Typography>
                )}
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Container>
  );
};

export default TemplateCard;
