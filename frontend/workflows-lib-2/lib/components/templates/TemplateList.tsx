import { Box } from "@mui/material";
import TemplateOverviewCard, { TemplateOverviewCardProps } from "./TemplateOverviewCard";

interface TemplateListProps {
    templateData: TemplateOverviewCardProps[]
}

export default function TemplateList({ templateData }: TemplateListProps) {
    return (
        <Box sx={{ overflowY: "auto"}}>
            { templateData.map((props, index) => (
                // Dont like this double box
                // Would be a lot better if I could set the margin in the Template Overview card from here
                // But that would be messy if I passed in a style prop
                <Box sx={{ margin: "10px", marginLeft: "5px"}}>
                    <TemplateOverviewCard 
                        key={index}
                        {...props}
                    />
                </Box>
            )) }
        </Box>
    );
}