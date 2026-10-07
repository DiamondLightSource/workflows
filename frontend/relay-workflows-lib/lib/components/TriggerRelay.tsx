
import { useCallback } from "react"
import { graphql } from "relay-runtime";
import { useMutation } from "react-relay";
import { TriggerAccordion } from "workflows-lib"

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
        console.log("calling");
        const mutationConfig = {
            variables: {name: props.name },
            onCompleted: () => { console.log("working!!"); },
            onError: (err: Error) => { console.log("error :("); console.log(err); }
        }
        if(props.enabled) {
            commitDisableTrigger(mutationConfig)
        }
        else {
            commitEnableTrigger(mutationConfig)
        }
    }, [props.enabled])

    return ( <TriggerAccordion toggleEnabled={toggleTrigger} {...props} /> )
}

export default TriggerRelay