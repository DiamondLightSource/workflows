import { useCallback } from "react";
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
}

function TriggerRelay(props: TriggerProps) {
  const [commitEnableTrigger] = useMutation(enableTriggerMutation);
  const [commitDisableTrigger] = useMutation(disableTriggerMutation);

  const toggleTrigger = useCallback(() => {
    let errorMessage = "";
    const mutationConfig = {
      variables: { name: props.name },
      onError: (err: Error) => {
        errorMessage = err.message;
      },
    };
    if (props.enabled) {
      commitDisableTrigger(mutationConfig);
    } else {
      commitEnableTrigger(mutationConfig);
    }
    return errorMessage;
  }, [props.enabled]);

  return <TriggerAccordion toggleEnabled={toggleTrigger} {...props} />;
}

export default TriggerRelay;
