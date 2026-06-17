import stomp
from time import sleep

START_MSG_JSON = {
    "name": "start",
    "doc": {
        "uid": "5e73af08-bb21-45d7-9bc1-6d5acc3dcca2",
        "time": 1777996434.039722,
        "versions": {
            "ophyd": "1.11.1",
            "ophyd_async": "0.17a5.dev0+g41962f2bd.d20260430",
            "bluesky": "1.15.0",
            "event_model": "1.23.1",
        },
        "instrument": "b01-1",
        "user": "bno96490",
        "instrument_session": "cm44191-1",
        "tiled_access_tags": ['{"proposal": 44191, "visit": 1, "beamline": "b01-1"}'],
        "data_session_directory": "/dls/b01-1/data/2026/cm44191-1/spool",
        "detector_file_template": "{instrument}-{scan_id}-{device_name}",
        "scan_file": "b01-1-1637",
        "scan_id": 1637,
        "plan_type": "generator",
        "plan_name": "spec_scan",
        "detectors": ["spectroscopy_detector", "sample_stage"],
        "motors": ["sample_stage-x", "sample_stage-y"],
        "num_points": 25,
        "num_intervals": 24,
        "plan_args": {
            "detectors": ["spectroscopy_detector", "sample_stage"],
            "spec": "Product(outer=Linspace(axis=<ophyd_async.epics.motor.Motor object at 0x7f9b7c876ed0>, start=0.0, stop=5.0, num=5), inner=Snake(spec=Linspace(axis=<ophyd_async.epics.motor.Motor object at 0x7f9b7c6d3190>, start=0.0, stop=5.0, num=5)), gap=True)",
        },
        "hints": {
            "dimensions": [
                [["sample_stage-x"], "primary"],
                [["sample_stage-y"], "primary"],
            ]
        },
        "shape": [5, 5],
        "spec": {
            "outer": {
                "axis": "<ophyd_async.epics.motor.Motor object at 0x7f9b7c876ed0>",
                "start": 0.0,
                "stop": 5.0,
                "num": 5,
                "type": "Linspace",
            },
            "inner": {
                "spec": {
                    "axis": "<ophyd_async.epics.motor.Motor object at 0x7f9b7c6d3190>",
                    "start": 0.0,
                    "stop": 5.0,
                    "num": 5,
                    "type": "Linspace",
                },
                "type": "Snake",
            },
            "gap": True,
            "type": "Product",
        },
    },
    "task_id": "0ad37bda-76bd-49b5-abb0-9b4488d33939",
}

STOP_MSG_JSON = {
    "name": "stop",
    "doc": {
        "uid": "9d12138e-b83c-44ad-9e62-f7547f5bf3c2",
        "time": 1777996486.3148549,
        "run_start": "5e73af08-bb21-45d7-9bc1-6d5acc3dcca2",
        "exit_status": "success",
        "reason": "",
        "num_events": {"primary": 25},
    },
    "task_id": "0ad37bda-76bd-49b5-abb0-9b4488d33939",
}


def produce_messages(conn: stomp.Connection):
    while True:
        conn.send("/queue/test", "test message")
        sleep(30)


def connect(
    host: str,
    port: int,
    destination: str,
    user: str,
    password: str,
    ack: str,
) -> stomp.Connection:
    conn = stomp.Connection(
        [(host, port)],
        heartbeats=(10000, 10000),
    )

    conn.set_listener("", stomp.PrintingListener())
    conn.connect(login=user, passcode=password, wait=True)
    return conn


if __name__ == "__main__":
    conn = connect(
        host="rabbitmq-demo",
        port=61613,
        destination="/queue/test",
        user="user",
        password="password",
        ack="auto",
    )
    produce_messages(conn)
