from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from typing import TypedDict, NotRequired, Literal
from pydantic import BaseModel, ValidationError

'''
The body of the POST request to /sync
'''
class SyncRequest(TypedDict):
  controller: dict
  parent: dict
  children: dict[str, dict]
  related: dict[str, dict]
  finalizing: bool

'''
The response expected from the sync hook
'''
class SyncResponse(TypedDict):
  status: dict
  children: list[dict]
  resyncAfterSeconds: NotRequired[float]

'''
The body of the POST request to /customize
'''
class CustomizeRequest(TypedDict):
  controller: dict
  parent: dict

""" 
A JSON object representing the desired resource description. A list of these
constitutes the response expected from the customize hook
"""
class ResourceRule(TypedDict):
  apiVersion: str
  resource: str
  labelSelector: NotRequired[dict[str, dict | list[dict]]]
  namespaceSelector: NotRequired[dict[str, dict | list[dict]]]
  namespace: NotRequired[str]
  names: NotRequired[list[str]]


class WorkflowParameter(BaseModel):
  name: str
  path: str | None = None
  default: str | None = None


class TriggerWorkflow(BaseModel):
  template: str
  triggerOnMessageType: Literal["start", "stop"] | None = None
  parameters: list[WorkflowParameter]


class TriggerSpec(BaseModel):
  enabled: bool
  eventName: str
  workflow: TriggerWorkflow


class TriggerMetadata(BaseModel):
  name: str
  labels: dict[str, str]


class Trigger(BaseModel):
  apiVersion: str
  kind: str
  metadata: TriggerMetadata
  spec: TriggerSpec


class Controller(BaseHTTPRequestHandler):
  def sync(self, parent: dict, related: dict) -> SyncResponse:

    triggers = []
    dependencies = []
    sourceTriggers: dict[str, dict] = related.get("Trigger.workflows.diamond.ac.uk/v1alpha1", {})
    eventSourceName: str | None = parent.get("metadata", {}).get("name")
    labels: dict = parent.get("metadata", {}).get("labels", {})
    beamline: str | None = labels.get("workflows.diamond.ac.uk/beamline")

    errored_triggers = []
    for dlsTrigger in sourceTriggers.values():
      trigger = {}
      try:
        trigger = Trigger(**dlsTrigger)
      except ValidationError:
        errored_triggers.append(trigger)
        continue

      name: str | None = trigger.metadata.name
      source_type: str | None = trigger.metadata.labels.get("workflows.diamond.ac.uk/source")
      uid: str | None = trigger.metadata.labels.get("workflows.diamond.ac.uk/posixuid")
      workflow = trigger.spec.workflow
      template = workflow.template
      eventName = trigger.spec.eventName

      dependency = {
        "name": name,
        "eventSourceName": eventSourceName,
        "eventName": eventName,
      }

      if workflow.triggerOnMessageType and source_type == "generic":
        filter = {
          "data": [{
            "path": "body.name",
            "type": "string",
            "value": [workflow.triggerOnMessageType],
          }]
        }
        dependency.update({"filters": filter})
      
      dependencies.append(dependency)
      sensorParams = [{
          "src": {
            "dependencyName": name, 
            "dataKey": "body.doc.instrument_session"
          },
          "dest": "metadata.namespace"
        }]
      templateArgs = []
      for userParam in workflow.parameters:
        param_name: str = userParam.name
        src = {"dependencyName": name}
        if userParam.path:
          src.update({"dataKey": "body." + userParam.path})
        if userParam.default:
          src.update({"value": userParam.default})
        sensorParams.append({
          "src": src,
          "dest": f"spec.arguments.parameters.#(name==\"{param_name}\").value"
        })

        templateArgs.append({"name": param_name, "value": ""})

      triggers.append({
        "template": {
          "name": name,
          "argoWorkflow": {
            "parameters": sensorParams,
            "operation": "submit",
            "source": {
              "resource": {
                "apiVersion": "argoproj.io/v1alpha1",
                "kind": "Workflow",
                "metadata": {
                  "generateName": f"{template}-event-",
                  "labels": {
                      "workflows.diamond.ac.uk/triggeruid": uid,
                    }
                },
                "spec": {
                  "serviceAccountName": "argo-workflow",
                  "workflowTemplateRef": {
                    "name": template,
                    "clusterScope": True
                  },
                  "arguments": {
                    "parameters": templateArgs
                  },
                },
              }
            }
          }
        }
      })

    if errored_triggers:
      print(f"ERROR: Unable to parse {len(errored_triggers)} trigger(s)")
      return {"status": {"error": 500}, "children": []}

    sensor = {
      "apiVersion": "argoproj.io/v1alpha1",
      "kind": "Sensor",
      "metadata": {
        "name": f"{beamline}-{eventSourceName}"
      },
      "spec": {
        "template":
          {"serviceAccountName": "operate-workflow-sa"},
        "dependencies": dependencies,
        "triggers": triggers
      }
    }

    desired_children = [sensor]

    desired_status = {
      "triggers": len(triggers)
    }

    return {"status": desired_status, "children": desired_children}

  def customize(self, parent: dict) -> list[ResourceRule]:

    beamline: str | None = parent.get("metadata", {}).get("labels", {}).get("workflows.diamond.ac.uk/beamline")
    sourceTypes: list[str] = list(parent.get("spec", {}).keys())

    if not sourceTypes or not beamline:
      return [] 

    return [{
      "apiVersion": "workflows.diamond.ac.uk/v1alpha1",
      "resource": "triggers",
      "labelSelector": {
        "matchExpressions": [{
          "key": "workflows.diamond.ac.uk/source",
          "operator": "In",
          "values": sourceTypes
        }],
        "matchLabels": {"workflows.diamond.ac.uk/beamline": beamline}
      }
    }]

  def do_POST(self):
    if self.path == '/sync':
      observed: SyncRequest = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))))
      desired = self.sync(
        observed.get("parent", {}),
        observed.get("related", {})
      )
      self.send_response(200)
      self.send_header("Content-type", "application/json")
      self.end_headers()
      self.wfile.write(json.dumps(desired).encode())

    elif self.path == '/customize':
      request: CustomizeRequest = json.loads(self.rfile.read(int(self.headers.get('content-length', 0))))
      related = self.customize(request.get("parent", {}))
      self.send_response(200)
      self.send_header("Content-type", "application/json")
      self.end_headers()
      self.wfile.write(json.dumps({"relatedResources": related}).encode())

    else:
      self.send_response(404)
      self.send_header("Content-type", "application/json")
      self.end_headers()
      error_msg = {
        "error": "404",
        "endpoint": self.path
      }
      self.wfile.write(json.dumps(error_msg).encode("utf-8"))

HTTPServer(("", 80), Controller).serve_forever()
