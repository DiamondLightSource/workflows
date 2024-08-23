use quote::quote;
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
    let schema = serde_json::from_str::<schemars::schema::RootSchema>(&raw_schema).unwrap();

    let mut type_space = TypeSpace::new(TypeSpaceSettings::default().with_struct_builder(true));
    type_space.add_root_schema(schema).unwrap();
    let mut tokens = quote! {
        use serde::{Serialize, Deserialize};
    };
    tokens.extend(type_space.to_stream());

    let contents = rustfmt_wrapper::rustfmt(tokens.to_string()).unwrap();

    create_dir_all(Path::new("src")).unwrap();
    let mut file = File::create("src/lib.rs").unwrap();
    file.write_all(contents.as_bytes()).unwrap();
}
