import { useCallback, useState } from "react";
import { graphql } from "relay-runtime";
import { useMutation } from "react-relay";
import { TriggerAccordion } from "workflows-lib";

const enableTriggerMutation = graphql`
  mutation TriggerRelayEnableMutation($name: String!) {
    enableTrigger(name: $name) {
      name
    }
  }
`;

const disableTriggerMutation = graphql`
  mutation TriggerRelayDisableMutation($name: String!) {
    disableTrigger(name: $name) {
      name
    }
  }
`;

interface TriggerProps {
  beamline: string | null | undefined;
  enabled: boolean;
  name: string | null | undefined;
  templateRef: string | null | undefined;
  creatorName: string | null;
}

function TriggerRelay(props: TriggerProps) {
  const [commitEnableTrigger] = useMutation(enableTriggerMutation);
  const [commitDisableTrigger] = useMutation(disableTriggerMutation);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );

  const toggleTrigger = useCallback(() => {
    const mutationConfig = {
      variables: { name: props.name },
      onCompleted: () => {
        setErrorMessage("");
      },
      onError: (err: Error) => {
        setErrorMessage(err.message);
      },
    };
    if (props.enabled) {
      commitDisableTrigger(mutationConfig);
    } else {
      commitEnableTrigger(mutationConfig);
    }
  }, [
    props.name,
    props.enabled,
    commitDisableTrigger,
    commitEnableTrigger,
    setErrorMessage,
  ]);

  return (
    <TriggerAccordion
      toggleEnabled={toggleTrigger}
      errorMessage={errorMessage}
      {...props}
    />
  );
}

export default TriggerRelay;
