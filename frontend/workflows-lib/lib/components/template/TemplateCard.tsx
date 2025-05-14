import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import { Template } from "../../types";
import React from "react";
import { Container, Box } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

interface TemplateCardProps {
  template: Template;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const reroute = (templateName: string) => {
    const path = location.pathname.split("/")[1];
    (navigate(`/${path}/${templateName}`) as Promise<void>).catch(
      (error: unknown) => {
        console.error("Navigation error:", error);
      }
    );
  };

  return (
    <Container maxWidth="sm">
      <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
        <Card sx={{ width: { xs: "100%", lg: "900px" } }}>
          <CardActionArea
            onClick={() => {
              reroute(template.name);
            }}
          >
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography gutterBottom variant="h5" component="div">
                  {template.title ?? template.name}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Maintainer: {template.maintainer}
                </Typography>
              </Box>
              <Typography gutterBottom>{template.name}</Typography>
              <Typography variant="caption" gutterBottom>
                {template.description ?? ""}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Container>
  );
};

export default TemplateCard;
