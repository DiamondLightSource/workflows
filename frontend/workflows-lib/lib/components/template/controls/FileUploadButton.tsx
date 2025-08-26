import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Typography,
} from "@mui/material";
import { UploadedFile } from "../../../types";

export interface FileUploadButtonProps {
  name: string;
  handleChange: (path: string, value: UploadedFile) => void;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  enabled?: boolean;
  visible?: boolean;
  id?: string;
}

const FileUploadButton = ({
  name,
  handleChange,
  label,
  description,
  error,
  required = false,
  enabled = true,
  visible = true,
  id,
}: FileUploadButtonProps) => {
  const [fileName, setFileName] = useState("");
  const [componentError, setComponentError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setComponentError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.readyState === 2) {
        handleChange(name, {
          fileName: file.name,
          content: reader.result,
          type: file.type,
        });
      }
    };

    reader.onerror = () => {
      setComponentError("Error reading file");
      console.error("FileReader error:", reader.error);
    };

    reader.readAsDataURL(file);
  };

  if (!visible) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        paddingTop: "20px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 2,
          alignItems: "center",
        }}
      >
        <FormControl>
          {label && (
            <FormLabel htmlFor={`upload-${name}`}>
              {label}
              {required && <span style={{ color: "red" }}> *</span>}
            </FormLabel>
          )}
          {description && (
            <Typography variant="caption" color="textSecondary">
              {description}
            </Typography>
          )}
        </FormControl>
        <Input
          inputProps={{ "data-testid": "file-input" }}
          style={{ display: "none" }}
          id={`upload-${name}`}
          type="file"
          onChange={onFileChange}
        />
        <label htmlFor={`upload-${name}`}>
          <Button
            id={id}
            variant="contained"
            component="span"
            disabled={!enabled}
          >
            Upload File
          </Button>
        </label>

        {fileName && (
          <Typography variant="body2" color="textSecondary">
            Selected file: {fileName}
          </Typography>
        )}
      </Box>

      {(componentError || error) && (
        <Typography variant="body2" color="error">
          {componentError || error}
        </Typography>
      )}
    </Box>
  );
};

export default FileUploadButton;
