use schemars::schema::{InstanceType, RootSchema, Schema, SchemaObject};
use std::{
    env,
    fs::{create_dir_all, File},
    io::Write,
    path::Path,
};
use typify::{TypeSpace, TypeSpaceSettings};

fn main() {
    let argo_server_schema_url =
        env::var("ARGO_SERVER_SCHEMA_URL").expect("ARGO_SERVER_SCHEMA_URL environment is not set.");
    let raw_schema = reqwest::blocking::get(&argo_server_schema_url)
        .and_then(|response| response.text())
        .unwrap_or_else(|_| panic!("Failed to retrieve argo server schema from {argo_server_schema_url}. Is ARGO_SERVER_SCHEMA_URL environment variable set?"));
    let mut schema: RootSchema = serde_json::from_str(&raw_schema).unwrap();
    // The upstream argo workflow API schema does not match with its API response.
    // This is a temporary fix to match the API response.

    let pod_gc = schema
        .definitions
        .get_mut("io.argoproj.workflow.v1alpha1.PodGC")
        .unwrap();
    let pod_gc = match pod_gc {
        Schema::Object(obj) => obj,
        _ => panic!("Expected PodGC to be a SchemaObject"),
    };
    let pod_gc_obj = pod_gc.object.as_mut().unwrap();
    let field = pod_gc_obj
        .properties
        .get_mut("deleteDelayDuration")
        .unwrap();
    *field = Schema::Object(SchemaObject {
        instance_type: Some(InstanceType::String.into()),
        ..Default::default()
    });

    let retry_strategy = schema
        .definitions
        .get_mut("io.argoproj.workflow.v1alpha1.RetryStrategy")
        .unwrap();

    let retry_strategy = match retry_strategy {
        Schema::Object(obj) => obj,
        _ => panic!("Expected RetryStrategy to be a SchemaObject"),
    };
    let retry_strategy_obj = retry_strategy.object.as_mut().unwrap();
    let field = retry_strategy_obj.properties.get_mut("limit").unwrap();
    *field = Schema::Object(SchemaObject {
        instance_type: Some(InstanceType::Integer.into()),
        ..Default::default()
    });

    let http_get = schema
        .definitions
        .get_mut("io.k8s.api.core.v1.HTTPGetAction")
        .unwrap();
    let http_get = match http_get {
        Schema::Object(obj) => obj,
        _ => panic!("Expected HTTPGetAction to be a SchemaObject"),
    };
    let http_get_obj = http_get.object.as_mut().unwrap();
    let port_field = http_get_obj.properties.get_mut("port").unwrap();
    *port_field = Schema::Object(SchemaObject {
        instance_type: Some(InstanceType::Integer.into()),
        ..Default::default()
    });

    let mut type_space = TypeSpace::new(TypeSpaceSettings::default().with_struct_builder(true));
    type_space.add_root_schema(schema).unwrap();

    let contents = rustfmt_wrapper::rustfmt(type_space.to_stream().to_string()).unwrap();

    create_dir_all(Path::new("src")).unwrap();
    let mut file = File::create("src/types.rs").unwrap();
    file.write_all(contents.as_bytes()).unwrap();
}
