import yaml
import os
import subprocess
import textwrap
import re

ignored_kinds = ["ClusterPolicy", "Job"]
resourced_kinds = ["Deployment", "StatefulSet", "Cronjob"]
forbidden_kinds = ["Ingress", "SealedSecret"]
problems = []

max_cpu = int(os.getenv("MAX_CPU", 10000))
max_mem = int(os.getenv("MAX_MEM", 50000))

cumulative_cpu = 0
cumulative_mem = 0

default_cpu_limit = 1
default_mem_limit = "1Gi"


def main():
    print("Running with max cpu: " + str(max_cpu) + " and max mem: " + str(max_mem))
    all_local_charts = (
        subprocess.run("ls charts", capture_output=True, shell=True)
        .stdout.decode()
        .strip()
        .split("\n")
    )
    active_charts = get_active_charts()
    enabled_charts = list(filter(lambda x: x in active_charts, all_local_charts))
    enabled_charts.append("workflows-cluster")
    print(enabled_charts)

    [check_chart(chart) for chart in enabled_charts]

    header = "-----Report-----"
    print("-" * len(header))
    print(header)
    print("-" * len(header))
    if problems:
        print("Problems found:")
        print("\n".join(problems))
        exit(1)

    print("No problems found!")
    print("total cpu: " + str(cumulative_cpu) + " mCore")
    print("total mem: " + str(cumulative_mem) + " Mi")
    exit(0)


def check_chart(chart):
    chart_path = f"./charts/{chart}"
    header = f"-----Checking chart {chart_path}-----"
    print("-" * len(header))
    print(header)
    print("-" * len(header))

    full_chart = get_chart_yaml(chart_path)
    subcharts = [chart for chart in full_chart.strip().split("---") if len(chart) > 0]

    subchart_status = [check_subchart(chart_path, subchart) for subchart in subcharts]

    if cumulative_cpu > max_cpu:
        problems.append(f"CPU limit exceeded: {cumulative_cpu} > {max_cpu}")
    if cumulative_mem > max_mem:
        problems.append(f"Memory limit exceeded: {cumulative_mem} > {max_mem}")


def extract_resource_limits_and_replicas(manifest):
    results = []

    def traverse(sub_manifest):
        if isinstance(sub_manifest, dict):
            key = "containers"
            if key in sub_manifest and isinstance(sub_manifest[key], list):
                for container in sub_manifest[key]:
                    if isinstance(container, dict):
                        resources = container.get("resources", {})
                        limits = resources.get("limits", {})
                        results.append(limits)
            for value in sub_manifest.values():
                traverse(value)
        elif isinstance(sub_manifest, list):
            for item in sub_manifest:
                traverse(item)

    traverse(manifest)

    replicas = manifest.get("spec", {}).get("replicas", None)

    return {"replicas": replicas, "limits": results}


def check_subchart(parent_chart, raw_sub_chart):
    global cumulative_cpu
    global cumulative_mem
    curr_chart = get_subchart_yaml(raw_sub_chart)
    if curr_chart == 1:
        return 1

    if curr_chart["kind"] in forbidden_kinds:
        print("---")
        print(f"{curr_chart['kind']} found")
        print(f"Name: {curr_chart['metadata']['name']}")
        problems.append(
            f"{curr_chart['kind']} found in {parent_chart} with name {curr_chart['metadata']['name']}"
        )
        return
    if curr_chart["kind"] in ignored_kinds:
        return

    resources = extract_resource_limits_and_replicas(curr_chart)
    resources_defined = resources["limits"] or resources["replicas"]

    if not resources_defined and (curr_chart["kind"] in resourced_kinds):
        resources = {
            "replicas": 1,
            "limits": [{"cpu": default_cpu_limit, "memory": default_mem_limit}],
        }
    elif not resources_defined:
        return 0

    replicas = resources.get("replicas", 1)
    cpu = [container.get("cpu", default_cpu_limit) for container in resources["limits"]]
    memory = [
        container.get("memory", default_mem_limit) for container in resources["limits"]
    ]

    numeric_cpu = [format_resource("cpu", value) for value in cpu]
    numeric_memory = [format_resource("memory", value) for value in memory]
    pod_resources = list(zip(numeric_cpu, numeric_memory))

    cumulative_cpu += sum(numeric_cpu) * replicas
    cumulative_mem += sum(numeric_memory) * replicas

    print("---")
    print(f"Name: {curr_chart['metadata']['name']}")
    print(f"Kind: {curr_chart['kind']}")
    print(f"Replicas: {replicas}")
    for pod in pod_resources:
        print(f"  CPU: {pod[0]} mCore - Memory: {pod[1]} Mi")


def format_resource(resource_type, value):
    value = str(value)
    if resource_type == "cpu":
        if value.endswith("m"):
            return int(value[:-1])
        return int(value) * 1000

    if resource_type == "memory":
        if value.endswith("Mi"):
            return int(value[:-2])
        elif value.endswith("Gi"):
            return int(value[:-2]) * 1024
        print("value: " + value)
        raise Exception(f"Invalid memory unit\nValue:{value}")

    raise Exception(f"Invalid resource type\n{value}")


def get_active_charts():
    with open("./charts/apps/dev-values.yaml") as f:
        values = yaml.safe_load(f)
        active_charts = [key for key in values if values[key]["enabled"]]
        return active_charts


def get_chart_yaml(path):
    command = f"helm template workflows-cluster {path}"
    if os.path.exists(f"{path}/dev-values.yaml"):
        command += f" -f {path}/dev-values.yaml"
        print("Using dev values ✅")
    else:
        print("No dev values could be found ❌")

    response = subprocess.run(command, capture_output=True, shell=True)
    if response.returncode != 0:
        raise Exception(f"Error running helm template\n{response.stderr.decode()}")

    return response.stdout.decode()


def get_subchart_yaml(raw_yaml):
    try:
        dedented = textwrap.dedent(raw_yaml)
        cleaned_placeholders = re.sub(r"{{.*?}}", "placeholder", dedented)
        parsed = yaml.safe_load(cleaned_placeholders)
        return parsed
    except Exception as err:
        print(f"Error parsing yaml {err}")
        print(raw_yaml)
        return 1


main()
