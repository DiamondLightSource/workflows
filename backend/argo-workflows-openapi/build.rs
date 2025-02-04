use schemars::schema::{InstanceType, RootSchema, Schema, SchemaObject};
use std::{
    env,
    fs::{create_dir_all, File},
    io::Write,
    path::Path,
};
use typify::{TypeSpace, TypeSpaceSettings};

fn main() {
    let raw_schema = reqwest::blocking::get(env::var("ARGO_SERVER_SCHEMA_URL").unwrap())
        .unwrap()
        .text()
        .unwrap();
    let mut schema: RootSchema = serde_json::from_str(&raw_schema).unwrap();
    // The upstream argo workflow API schema does not match with its API response.
    // This is a temporary fix to match the API response.
    if let Some(Schema::Object(ref mut pod_gc)) = schema
        .definitions
        .get_mut("io.argoproj.workflow.v1alpha1.PodGC")
    {
        let delete_delay_duration = pod_gc
            .object
            .as_mut()
            .unwrap()
            .properties
            .get_mut("deleteDelayDuration")
            .unwrap();
        *delete_delay_duration = Schema::Object(SchemaObject {
            instance_type: Some(InstanceType::String.into()),
            ..Default::default()
        });
    }

    let mut type_space = TypeSpace::new(TypeSpaceSettings::default().with_struct_builder(true));
    type_space.add_root_schema(schema).unwrap();

    let contents = rustfmt_wrapper::rustfmt(type_space.to_stream().to_string()).unwrap();

    create_dir_all(Path::new("src")).unwrap();
    let mut file = File::create("src/types.rs").unwrap();
    file.write_all(contents.as_bytes()).unwrap();
}
