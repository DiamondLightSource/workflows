import { Box, Typography } from "@mui/material";
import React from "react";
import { Handle, Position } from "@xyflow/react";
import { getStatusIcon } from "../common/StatusIcons";
interface CustomNodeProps {
  data: {
    label: string;
    status: string;
  };
}

const truncateLabel = (text: string) => {
  const maxLength = 16;
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, 3)}...${text.slice(-3)}`;
};

const CustomNode: React.FC<CustomNodeProps> = ({ data }) => {
  const truncatedLabel = truncateLabel(data.label);
  return (
    <Box
      style={{
        padding: 8,
        border: "1px solid #ddd",
        borderRadius: 8,
        minWidth: 160,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#555" }}
      />
      <Box
        display="flex"
        justifyContent="space-around"
        alignItems="center"
        padding={0.5}
        minWidth={110}
      >
        <Typography variant="body1">{truncatedLabel}</Typography>
        {getStatusIcon(data.status)}
      </Box>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#555" }}
      />
    </Box>
  );
};

export default CustomNode;
