import { Box, Button, Input, Typography } from "@mui/material";
import { useState } from "react";
import { FileUploadButtonProps } from "../../../types";

const FileUploadButton = ({ name, handleChange }: FileUploadButtonProps) => {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

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
      setError("Error reading file");
      console.error("FileReader error:", reader.error);
    };

    reader.readAsDataURL(file);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 2,
        alignItems: "center",
        paddingTop: "20px",
      }}
    >
      <Input
        inputProps={{ "data-testid": "file-input" }}
        style={{ display: "none" }}
        id={`upload-${name}`}
        type="file"
        onChange={onFileChange}
      />
      <label htmlFor={`upload-${name}`}>
        <Button variant="contained" component="span">
          Upload File
        </Button>
      </label>
      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : fileName ? (
        <Typography variant="body2" color="textSecondary">
          Selected file: {fileName}
        </Typography>
      ) : null}
    </Box>
  );
};

export default FileUploadButton;
