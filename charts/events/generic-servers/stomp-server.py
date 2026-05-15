import generic_pb2
import generic_pb2_grpc
import stomp
import grpc
import logging
import stomp.utils
import queue
import json
import os
from concurrent import futures
from pydantic import BaseModel, ConfigDict
from typing import Literal


class EventSourceConfig(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    user: str
    password: str
    host: str
    port: int
    destination: str
    ack: Literal["auto", "client", "client-individual"] = "auto"

def parse_config(config: bytes) -> EventSourceConfig | None:
    try:
        decoded_confid = config.decode()
        config_entries = decoded_confid.strip().split("\n")
        config_dict = dict(entry.split(": ") for entry in config_entries)
        return EventSourceConfig.model_validate(config_dict)
    except:
        logging.error("Unable to parse EventSource config")
        return


def _build_event(payload: str) -> generic_pb2.Event:
    return generic_pb2.Event(name="workflow-trigger", payload=payload.encode())


class _StompListener(stomp.ConnectionListener):
    def __init__(self, q):
        self.q = q

    def on_connected(self, frame: stomp.utils.Frame) -> None:
        logging.info("Connected to STOMP broker")

    def on_disconnected(self) -> None:
        logging.warning("Disconnected from STOMP broker")

    def on_error(self, frame: stomp.utils.Frame) -> None:
        logging.error("Broker error: %s", frame.body)

    def on_message(self, frame: stomp.utils.Frame) -> None:
        logging.debug("Message received: %s", frame.body)
        if isinstance(frame.body, str):
            messageJson = json.loads(frame.body)
            if messageJson.get("name") == "start":
                self.q.put(frame.body)

    def on_heartbeat(self):
        logging.debug("Hearbeat received")

class StompEventServicer(generic_pb2_grpc.EventingServicer):
    def StartEventSource(self, request, context):
        event_queue = queue.SimpleQueue()
        config = parse_config(request.config)

        if not config:
            logging.error("No config supplied")
            return
        logging.debug("Using config: %s", config)
        conn = stomp.Connection([(config.host, config.port)], heartbeats=(10000, 10000))
        conn.set_listener("", _StompListener(event_queue))
        conn.connect(
            login=config.user,
            passcode=config.password,
            wait=True,
            headers={"host": "/"},
        )
        conn.subscribe(
            destination=config.destination, id="workflows-trigger", ack=config.ack
        )

        while True:
            try:
                msg = event_queue.get(timeout=1)
            except queue.Empty:
                continue

            yield _build_event(msg)


def serve():
    port = "50051"
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    generic_pb2_grpc.add_EventingServicer_to_server(StompEventServicer(), server)
    server.add_insecure_port("[::]:" + port)
    server.start()
    logging.info("Server started, listening on " + port)
    server.wait_for_termination()


if __name__ == "__main__":
    LOG_LEVEL = os.environ.get("LOGLEVEL", "INFO").upper()
    logging.basicConfig(
        level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s - %(message)s"
    )
    serve()
