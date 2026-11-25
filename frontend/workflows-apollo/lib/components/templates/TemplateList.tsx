import { TemplateList } from "workflows-ui";
import { useQuery } from "@apollo/client/react";
import { Progress } from "@diamondlightsource/sci-react-ui";
import { Box, useTheme } from "@mui/material";
import { templatesOverviewQuery } from "../../apollo/queries/TemplateListQuery";

interface TemplateListProps {
  selectedName: string | null;
  setSelectedName: (name: string) => void;
}

export default function ApolloTemplateList(props: TemplateListProps) {
  const theme = useTheme();
  const { loading, error, data } = useQuery(templatesOverviewQuery);
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  if (error) throw error;
  if (loading) {
    return (
      <Box margin="auto" marginTop={theme.spacing(3)}>
        <Progress size="large" />
      </Box>
    );
  }
  if (data === undefined) {
    throw {
      name: "UndefinedData",
      message: "Query data is undefined",
    } as Error;
  }
  return (
    <TemplateList cardPropsList={data.workflowTemplates.nodes} {...props} />
  );
}
