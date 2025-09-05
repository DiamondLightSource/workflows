import {Button, TextField} from "@mui/material"
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
        <>
        <TextField 
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => handleKeyPress(e.key)}
        >
            
        </TextField>
        <Button onClick={() => searchSetter(searchTerm)}>
            Search
        </Button>
        </>
    )
}

