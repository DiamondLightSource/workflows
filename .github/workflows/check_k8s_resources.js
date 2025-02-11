const path = require('path/posix');
const fs = require('fs')
const execSync = require('child_process').execSync;
const YAML = require('yaml');


let resourced_kinds = ["Deployment", "StatefulSet", "Cronjob"];
let forbidden_kinds = ["Ingress", "SealedSecret"];
// `probelms` array is used to record failing criteria 
// to pvide a summary at the end of the ci
let problems = [];


// Maximum CPU and Memory to pass
let max_cpu = process.env.MAX_CPU || 10000;
let max_mem = process.env.MAX_MEM || 50000;

let cpu_usage = 0;
let mem_usage = 0;

// Assumed CPU and Memory limits if not defined
let default_cpu_limit = 1;
let default_mem_limit = "1Gi";


function main(chart_root) {
  console.log("Running with max cpu: " + max_cpu + " and max mem: " + max_mem);

  const chart_list = execSync(`ls ${path.join(chart_root)}`, { encoding: 'utf-8' });
  const active_apps = get_active_charts();
  let local_charts = chart_list.trim().split("\n");

  // Remove all charts that are not enabled in charts/apps
  let charts_to_template = local_charts.filter(chart => active_apps.includes(chart));
  // Workflows-cluster is manually added as it has no app as it is the cluster entry point
  charts_to_template.push("workflows-cluster")
  console.log("Templating the following charts: ")
  console.log(charts_to_template);

  charts_to_template.forEach(chart => check_chart(path.join(chart_root, chart)));
  console.log(`Total CPU usage: ${cpu_usage} mCPU`);
  console.log(`Total Memory usage: ${mem_usage} Mi`);

  verify_success();

  process.exit(0)
}

function verify_success() {
  // Explicitly checks against criteria 
  if (cpu_usage > max_cpu) {
    problems.push(`CPU usage exceeds the limit of ${max_cpu} mCPU`);
  }
  if (mem_usage > max_mem) {
    problems.push(`Memory usage exceeds the limit of ${max_mem} Mi`);
  }

  if (problems.length > 0) {
    console.log("Problems found:");
    console.log(problems);
    process.exit(1);
  }

  console.log("\nAll checks passed ✅");
  process.exit(0);
}

function get_active_charts() {
  const file = fs.readFileSync('./charts/apps/dev-values.yaml', 'utf8')
  let apps_yaml = YAML.parse(file);
  let enabled_charts = [];

  for (let key in apps_yaml) {
    if (apps_yaml[key].enabled) {
      enabled_charts.push(key);
    }
  }
  return enabled_charts;
}

function check_chart(chart_path) {
  // Purely cosmetic
  let header = `-----Checking chart ${chart_path}-----`;
  console.log("-".repeat(header.length));
  console.log(header);
  console.log("-".repeat(header.length));


  let full_chart = get_chart_template(chart_path);
  let sub_charts = full_chart.trim().split("---");

  sub_charts.forEach(sub_chart => {
    let parsed_chart = YAML.parse(sub_chart);
    if (parsed_chart == null) {
      return;
    }

    // Check for explicitly dis-allowed chart kinds eg ingresses
    if (forbidden_kinds.includes(parsed_chart.kind)) {
      console.log(`---`);
      console.log(`${parsed_chart.kind} found`);
      console.log(`Name: ${parsed_chart.metadata.name}`);
      problems.push(`${parsed_chart.kind} found in ${chart_path} with name ${parsed_chart.metadata.name}`);
      return;
    }

    // DFS through the chart yaml to find the resources.
    // Allows us to find resources without having to explicitly
    // know what kind of chart we are dealing with
    let resources = traverse_for_resources("resources", parsed_chart, "limits");
    let replicas = traverse_for_resources("replicas", parsed_chart, null);


    // If we find either a replicas or a resources,
    // we can assume this is a pod-creating chart.
    // If all criteria are not provided, we can fill in 
    // the missing components with the default cluster values
    let defined_resources = { all: true, cpu: true, mem: true };
    if (!resources && !replicas && resourced_kinds.includes(parsed_chart.kind)) {
      // This case is checked for a few kinds where we known they should hav 
      // resources etc but don't
      defined_resources.all = false;
    }
    if (!resources && !replicas) {
      return
    }

    if (!resources) {
      resources = { limits: { cpu: `${default_cpu_limit}`, memory: `${default_mem_limit}` } }
      defined_resources.all = false;
      defined_resources.cpu = false;
      defined_resources.mem = false;
    }
    if (!resources.limits.cpu) {
      resources.limits.cpu = `${default_cpu_limit}`;
      defined_resources.cpu = false;
    }
    if (!resources.limits.memory) {
      resources.limits.memory = `${default_mem_limit}`;
      defined_resources.mem = false;
    }
    if (!replicas) {
      replicas = 1
    }

    cpu_usage += fix_cpu_units(String(resources.limits.cpu)) * replicas;
    mem_usage += fix_mem_units(String(resources.limits.memory)) * replicas;

    console.log(`---`);
    console.log(`Name: ${parsed_chart.metadata.name}`);
    console.log(`Kind: ${parsed_chart.kind}`);
    console.log(`Resource Limits: CPU ${resources.limits.cpu}, Mem ${resources.limits.memory}`);
    console.log(`Replicas: ${replicas}`);

    if (!defined_resources.all) {
      console.log("No resources limits defined ⚠️  ");
    } else if (!defined_resources.cpu) {
      console.log("No resources limits for CPU defined ⚠️  ");
    } else if (!defined_resources.mem) {
      console.log("No resources limits for memory defined ⚠️  ");
    } else {
      console.log("All resource limits defined ✅");
    }
  });
  console.log("");
}

function fix_cpu_units(usage) {
  // Target unit in mCPU
  if (usage.endsWith("m")) {
    return Number(usage.slice(0, -1));
  }
  return Number(usage) * 1000;
}

function fix_mem_units(usage) {
  // Target unit Mi
  if (usage.endsWith("Mi")) {
    return Number(usage.slice(0, -2));
  }
  else if (usage.endsWith("Gi")) {
    return Number(usage.slice(0, -2)) * 1024;
  }
}

function traverse_for_resources(target_key, yaml, match_key) {
  if (yaml === null || typeof yaml !== 'object') {
    return undefined;
  }

  if (yaml.hasOwnProperty(target_key)) {
    // resource can appear in two different contexts so the match_key is used 
    // to check which is occuring
    if (match_key && yaml[target_key].hasOwnProperty(match_key) || !match_key) {
      return yaml[target_key];
    }
  }

  if (Array.isArray(yaml)) {
    for (let i = 0; i < yaml.length; i++) {
      const result = traverse_for_resources(target_key, yaml[i], match_key);
      if (result !== undefined) {
        return result;
      }
    }
  } else {

    for (let key in yaml) {
      if (key === "schema") {
        continue;
      }
      const result = traverse_for_resources(target_key, yaml[key], match_key);
      if (result !== undefined) {
        return result;
      }
    }
  }

  return undefined;
}

function get_chart_template(chart_path) {
  let command = `helm template test ${chart_path}`;

  if (fs.existsSync(`${chart_path}/dev-values.yaml`)) {
    command += ` -f ${chart_path}/dev-values.yaml`;
    console.log("Using dev values ✅");
  } else {
    console.log("No dev values could be found ❌");
  }

  return execSync(command, { encoding: 'utf-8', maxBuffer: 1000 * 1000 * 10 });
}

module.exports = main;
main("charts");
