import { Box, Typography } from "@mui/material";
import { Theme } from "@mui/material/styles";
// Need to have a sci-react-ui import to use their theming
import { Logo } from "@diamondlightsource/sci-react-ui";

export interface TemplateOverviewCardProps {
    name: String
    maintainer: String
    title: String | null
    description: String | null
}

export default function TemplateOverviewCard(
    {
        name, 
        maintainer, 
        title, 
        description
    }: TemplateOverviewCardProps) {

    return (
        <Box sx={{
            background: (theme: Theme) => theme.palette.background.paper, 
            borderBottom: "2px solid", 
            borderColor: (theme: Theme) => theme.palette.surface.strong,
            padding: "10px"
            }}>
            <Typography variant="h5">{title}</Typography>
            {/* A bit lazy, should probably use a divider and flex box */}
            <Typography sx={{color: (theme: Theme) => theme.palette.text.secondary }}>{name} | {maintainer}</Typography>
            <Typography>{description}</Typography>
        </Box>
    );
}