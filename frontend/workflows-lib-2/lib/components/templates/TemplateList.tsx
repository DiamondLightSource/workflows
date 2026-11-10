import { Box } from "@mui/material";
import TemplateOverviewCard, { CardInfo } from "./TemplateOverviewCard";

// selectedTemplateName and setSelectedTemplate name should just be the result of
// useState<String | null>(null);
interface TemplateListProps {
    templateData: CardInfo[]
    selectedTemplateName: String | null
    setSelectedTemplateName: (selectedTemplateName: String) => void
}

export default function TemplateList({ 
    templateData, 
    selectedTemplateName, 
    setSelectedTemplateName 
}: TemplateListProps) {

    return (
        <Box sx={{ overflowY: "auto"}}>
            { templateData.map((props, index) => (
                // Dont like this double box
                // Would be a lot better if I could set the margin in the Template Overview card from here
                // But that would be messy if I passed in a style prop
                <Box sx={{ margin: "10px", marginLeft: "5px"}}>
                    <TemplateOverviewCard 
                        key={index}
                        selected={props.name === selectedTemplateName}
                        onSelect={() => setSelectedTemplateName(props.name)}
                        cardInfo={props}
                    />
                </Box>
            )) }
        </Box>
    );
}