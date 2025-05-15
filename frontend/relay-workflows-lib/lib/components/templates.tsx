import { graphql } from "react-relay";
import { useLazyLoadQuery } from "react-relay/hooks";
import { templatesListQuery } from "./__generated__/templatesListQuery.graphql";
import { Template, TemplateCard } from "workflows-lib";
import { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

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
    // 🔍 State for search term
    const [search, setSearch] = useState<string>("");

    // 🚀 Fetch data
    const data = useLazyLoadQuery<templatesListQuery>(TemplateListQuery, {
        limit: 10,
        cursor: null,
    });

    // 📝 Filtered template list
    const filteredTemplates = data.workflowTemplates.nodes.filter((t: Template) => {
        const p1 = t.title?.toLowerCase() || "";
        const p2 = t.name?.toLowerCase() || "";
        const p3 = t.description?.toLowerCase() || "";
        const p4 = t.maintainer?.toLowerCase() || "";
        return [p1, p2, p3, p4].some((i) => i.includes(search.toLowerCase()));
    });

    return (
        <Box sx={{ padding: 3 }}>
            {/* Search Input */}
            <Typography variant="h5" gutterBottom>
                Workflow Templates
            </Typography>

            <TextField
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ marginBottom: 2 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon color="action" />
                        </InputAdornment>
                    ),
                }}
            />

            {/* Search Hint */}
            <Typography variant="body2" color="textSecondary" sx={{ marginBottom: 2 }}>
                🔍 Search will match against <b>name</b>, <b>title</b>, <b>description</b>, or <b>maintainer</b>.
            </Typography>

            {/* Render Filtered Templates */}
            {filteredTemplates.length > 0 ? (
                filteredTemplates.map((node: Template, index: number) => (
                    <TemplateCard key={index} template={node} />
                ))
            ) : (
                <Typography variant="body1" color="textSecondary">
                    No templates found.
                </Typography>
            )}
        </Box>
    );
}
