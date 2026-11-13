import { TemplateList, templateListQueryString, TemplateListQueryType } from "workflows-lib-2"
import { useQuery } from "@apollo/client/react";
import { gql, TypedDocumentNode } from "@apollo/client";

interface TemplateListProps {
    selectedTemplateName: String | null
    setSelectedTemplateName: (selectedTemplateName: String) => void
}

export default function(props: TemplateListProps) {
    const queryGql: TypedDocumentNode<TemplateListQueryType> = gql(templateListQueryString);
    const { loading, error, data } = useQuery(queryGql);
    if (loading) return "Loading...";
    if (error) return `Error! ${error.message}`;
    if (data === undefined) return `Data undefined`;

    return (
        <TemplateList templateData={data} {...props} />
    );
}