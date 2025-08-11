import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Visit, visitToText } from "@diamondlightsource/sci-react-ui";
import { visitTextToVisit } from "workflows-lib/lib/utils/commonUtils";

export const useVisitInput = (initialVisitId?: string | null) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visit, setVisit] = useState<Visit | null>(
    visitTextToVisit(initialVisitId ?? undefined),
  );

  const handleVisitSubmit = (visit: Visit | null) => {
    if (visit) {
      const route = location.pathname.split("/")[1]; // Extract the first segment of the path
      const visitid = visitToText(visit);
      localStorage.setItem("instrumentSessionID", visitid);
      (navigate(`/${route}/${visitid}/`) as Promise<void>)
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

export function ScrollRestorer() {
  const scrollRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      scrollRef.current = window.scrollY;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, scrollRef.current);
  }, []);

  return null;
}
