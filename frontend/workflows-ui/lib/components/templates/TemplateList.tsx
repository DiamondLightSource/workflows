import { Info } from "lucide-react";
import TemplateOverviewButton from "./TemplateOverviewButton";
import TemplateOverviewCard from "./TemplateOverviewCard";
import { TemplateOverviewCommonProps } from "./TemplateOverviewCommon";
import { Box, Typography, useTheme } from "@mui/material";
import { Stack } from "@mui/system";

interface TemplateListProps {
  cardPropsList: TemplateOverviewCommonProps[];
  selectedName: string | null;
  setSelectedName: (name: string) => void;
  disableClick?: boolean;
}

export default function TemplateList({
  cardPropsList,
  selectedName,
  setSelectedName,
  disableClick = false,
}: TemplateListProps) {
  const theme = useTheme();

  return (
    <Box height="100%" width="100%" overflow="scroll">
      <Stack sx={{ width: "100%" }}>
        {cardPropsList.length === 0 ? (
          <Stack
            color={theme.vars?.palette.info.main}
            marginTop={theme.spacing(2)}
            direction="row"
            justifyContent="center"
          >
            <Info size="24px" />
            <Typography
              marginLeft={theme.spacing(1)}
              variant="h5"
              textAlign="center"
            >
              {" "}
              No Templates Found
            </Typography>
          </Stack>
        ) : (
          cardPropsList.map((props, index) =>
            disableClick ? (
              <TemplateOverviewCard key={index} {...props} />
            ) : (
              <TemplateOverviewButton
                key={index}
                cardProps={props}
                selected={props.name === selectedName}
                onSelect={() => {
                  setSelectedName(props.name);
                }}
              />
            ),
          )
        )}
      </Stack>
    </Box>
  );
}
