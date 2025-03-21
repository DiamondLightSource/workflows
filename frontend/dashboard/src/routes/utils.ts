import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Visit } from "workflows-lib";
import { visitToText, visitTextToVisit } from "workflows-lib/lib/components/common/utils";

export const useVisitInput = (initialVisitId?: string) => {
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(visitTextToVisit(initialVisitId));

  const handleVisitSubmit = (visit: Visit | null) => {
    if (visit) {
      const visitid = visitToText(visit);
      (navigate(`/workflows/${visitid}/`) as Promise<void>)
        .then(() => {
          setVisit(visit);
        })
        .catch((error: unknown) => {
          console.error("Navigation error:", error);
        });
    }
  };

  return { visit, handleVisitSubmit };
};
