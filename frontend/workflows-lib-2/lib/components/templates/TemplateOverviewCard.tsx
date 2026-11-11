import { Box, ButtonBase, Typography } from "@mui/material";
import { Theme } from "@mui/material/styles";
// Need to have a sci-react-ui import to use their theming
import { Logo } from "@diamondlightsource/sci-react-ui";

export interface CardInfo {
    name: String
    maintainer: String
    title: String | null
    description: String | null
}

interface TemplateOverviewCardProps {
    cardInfo: CardInfo
    selected: boolean
    onSelect: () => void
}

export default function TemplateOverviewCard(
    {
        cardInfo: {
            name, 
            maintainer, 
            title, 
            description 
        },
        selected,
        onSelect
    }: TemplateOverviewCardProps) {

    const backgroundColour = selected ? (theme: Theme) => theme.palette.primary.container : (theme: Theme) => theme.palette.background.paper;
    const hoverColour = selected ? (theme: Theme) => theme.palette.primary.container : (theme: Theme) => theme.palette.surface.subtle;

    return (
        <ButtonBase
            onClick={ onSelect }
        >
            <Box sx={{
                transition: "all 0.3s ease",
                bgcolor: backgroundColour,
                '&:hover': { bgcolor: hoverColour },
                borderBottom: "2px solid", 
                borderColor: (theme: Theme) => theme.palette.surface.strong,
                padding: "10px",
                textAlign: "left"
                }}>
                    <Typography variant="h5" noWrap>{title}</Typography>
                    {/* A bit lazy, should probably use a divider and flex box */}
                    <Typography sx={{color: (theme: Theme) => theme.palette.text.secondary,}} noWrap>{name} | {maintainer}</Typography>
                    {/* 
                        This is a long list of styles and some of them are depricated (WebkitBoxOrient) 
                        But literally nothing else works 
                        All I want is to cut text off at the third line and display elipses (...)
                    */}
                    <Typography sx={{
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        display: "-webkit-box", 
                        WebkitLineClamp: "3", 
                        WebkitBoxOrient: "vertical"
                        }}>{description}</Typography>
            </Box>
        </ButtonBase>
    );
}