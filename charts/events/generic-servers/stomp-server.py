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
from deepmerge import conservative_merger


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
        decoded_config = config.decode()
        config_entries = decoded_config.strip().split("\n")
        config_dict = dict(entry.split(": ") for entry in config_entries)
        return EventSourceConfig.model_validate(config_dict)
    except:
        logging.error("Unable to parse EventSource config")
        return


def _build_event(payload: str) -> generic_pb2.Event:
    return generic_pb2.Event(name="workflow-trigger", payload=payload.encode())


class ConnectionManager:
    def __init__(self):
        self.connection: stomp.Connection
        self.queue = queue.SimpleQueue()
        self.start_messages: dict[str, dict] = {}

    def create_connection(self, request: generic_pb2.EventSource) -> None:
        config = parse_config(request.config)

        if not config:
            logging.error("No config supplied")
            return
        logging.debug("Using config: %s", config)
        conn = stomp.Connection([(config.host, config.port)], heartbeats=(10000, 10000))
        conn.set_listener("", _StompListener(self.queue, self.start_messages))
        conn.connect(
            login=config.user,
            passcode=config.password,
            wait=True,
            headers={"host": "/"},
        )
        conn.subscribe(
            destination=config.destination, id="workflows-trigger", ack=config.ack
        )
        self.connection = conn

    def get_queue(self) -> queue.SimpleQueue:
        return self.queue

    def get_connection(self) -> stomp.Connection:
        return self.connection


class _StompListener(stomp.ConnectionListener):
    def __init__(self, q, start_messages):
        self.q: queue.SimpleQueue = q
        self.start_messages: dict[str, dict] = start_messages

    def _add_start_message(self, message: dict):
        uid: str | None = message.get("doc", {}).get("uid")
        if uid:
            self.start_messages.update({uid: message})

    def _merge_stop_with_start(self, stop_message: dict):
        uid: str | None = stop_message.get("doc", {}).get("run_start")
        if uid:
            start_message = self.start_messages.pop(uid, {})
            return conservative_merger.merge(stop_message, start_message)
        logging.error(f"Unable to find start message with uid {uid}")

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
            message_type = messageJson.get("name")
            if message_type == "start":
                self._add_start_message(messageJson)
                self.q.put(frame.body)
            elif message_type == "stop":
                matched_message = self._merge_stop_with_start(messageJson)
                if matched_message:
                    self.q.put(json.dumps(matched_message))

            else:
                logging.debug(f"Unsupported message type: {message_type}")

    def on_heartbeat(self) -> None:
        logging.debug("Hearbeat received")


class StompEventServicer(generic_pb2_grpc.EventingServicer):
    def StartEventSource(self, request: generic_pb2.EventSource, context):
        conn_manager = ConnectionManager()
        conn_manager.create_connection(request)
        msg_queue = conn_manager.get_queue()
        while msg_queue:
            try:
                msg = msg_queue.get(timeout=1)
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
