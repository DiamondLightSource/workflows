import { Search } from "@mui/icons-material"
import { Button, Stack, TextField } from "@mui/material"
import { useState } from "react"

interface SearchFieldProps {
    searchSetter: React.Dispatch<React.SetStateAction<string>>
}

export default function SearchField({searchSetter}: SearchFieldProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const handleKeyPress = (key: string) => {
        if(key !== "Enter") {return};
        searchSetter(searchTerm);
    }
    

    return(
        <Stack direction="row" spacing={1} justifyContent="center">
            <TextField 
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => handleKeyPress(e.key)}
                slotProps={{
                    input: {
                        startAdornment: <Search/>
                    }
                }}
            >
            </TextField>
            <Button
                onClick={() => searchSetter(searchTerm)}
                variant="contained"
                color="primary"
            >
                Search
            </Button>
        </Stack>
    )
}

