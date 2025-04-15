import { graphql } from "react-relay";
import { useLazyLoadQuery } from "react-relay/hooks";
import { templatesListQuery } from "./__generated__/templatesListQuery.graphql";
import { TemplateCard } from "workflows-lib";

const TemplateListQuery = graphql`
    query templatesListQuery($cursor: String, $limit: Int!) {
        workflowTemplates(cursor: $cursor, limit: $limit) {
        pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
        }
        nodes {
            name
            description
            title
            maintainer
        }
    }
    }
`;

export default function Templates() {

    const data = useLazyLoadQuery<templatesListQuery>(TemplateListQuery,{
        limit: 10,
        cursor: null,
    });

    const templateList = data.workflowTemplates.nodes.map((node, index )=> {
        return <TemplateCard
            key={index}
            template={node}
        />
    });

    return (templateList);

}
