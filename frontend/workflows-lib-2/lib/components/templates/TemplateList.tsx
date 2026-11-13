import { Box } from "@mui/material";
import TemplateOverviewCard from "./TemplateOverviewCard";
// import { gql } from "@apollo/client";
import { gql } from "../../utils/gql";
import { GetTemplatesQuery } from "../../types/__generated__/graphql";

export const queryString = gql`
    query getTemplates{
        workflowTemplates {
            nodes {
                name,
                maintainer,
                title,
                description
            }
        }
    }
`;

// selectedTemplateName and setSelectedTemplate name should just be the result of
// useState<String | null>(null);
interface TemplateListProps {
    templateData: GetTemplatesQuery
    selectedTemplateName: String | null
    setSelectedTemplateName: (selectedTemplateName: String) => void
}

export default function TemplateList({ 
    templateData, 
    selectedTemplateName, 
    setSelectedTemplateName 
}: TemplateListProps) {

    return (
        <Box sx={{ minHeight: 0, overflowY: "auto" }}>
            { templateData.workflowTemplates.nodes.map((props, index) => (
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