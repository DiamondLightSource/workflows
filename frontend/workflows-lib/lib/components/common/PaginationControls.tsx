import { Box, FormControl, MenuItem, Pagination, Select } from "@mui/material";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedLimit: number;
  onLimitChange: (limit: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  selectedLimit,
  onLimitChange,
}: PaginationControlsProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
        mt: 2,
      }}
    >
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={(_, page) => {
          onPageChange(page);
        }}
        showFirstButton
        siblingCount={1}
        boundaryCount={0}
      />
      <FormControl sx={{ width: 80 }}>
        <Select
          size="small"
          value={selectedLimit.toString()}
          onChange={(e) => {
            onLimitChange(Number(e.target.value));
          }}
          aria-label="Results Per Page"
        >
          {[5, 10, 20, 30].map((val) => (
            <MenuItem key={val} value={val}>
              {val}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
