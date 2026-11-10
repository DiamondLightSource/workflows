import { Box } from "@mui/material";
import TemplateOverviewCard, { CardInfo } from "./TemplateOverviewCard";
import { useState } from "react";

interface TemplateListProps {
    templateData: CardInfo[]
}

export default function TemplateList({ templateData }: TemplateListProps) {

    const [selectedName, setSelectedName] = useState<String | null>(null);

    return (
        <Box sx={{ overflowY: "auto"}}>
            { templateData.map((props, index) => (
                // Dont like this double box
                // Would be a lot better if I could set the margin in the Template Overview card from here
                // But that would be messy if I passed in a style prop
                <Box sx={{ margin: "10px", marginLeft: "5px"}}>
                    <TemplateOverviewCard 
                        key={index}
                        selected={props.name === selectedName}
                        onSelect={() => setSelectedName(props.name)}
                        cardInfo={props}
                    />
                </Box>
            )) }
        </Box>
    );
}