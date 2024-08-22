use opentelemetry::KeyValue;
use opentelemetry_otlp::{new_exporter, new_pipeline, WithExportConfig};
use opentelemetry_sdk::{propagation::TraceContextPropagator, runtime, trace::Config, Resource};
use opentelemetry_semantic_conventions::resource::{SERVICE_NAME, SERVICE_VERSION};
use std::time::Duration;
use tracing::{level_filters::LevelFilter, Level};
use tracing_opentelemetry::{MetricsLayer, OpenTelemetryLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use url::Url;

/// Provides crate information from the time it was built
mod built_info {
    include!(concat!(env!("OUT_DIR"), "/built.rs"));
}

/// Sets up Logging & Tracing using opentelemetry if available
pub fn setup_telemetry(
    metrics_endpoint: Option<Url>,
    tracing_endpoint: Option<Url>,
    telemetry_level: Level,
) -> anyhow::Result<()> {
    let level_filter = LevelFilter::from_level(telemetry_level);
    let log_layer = tracing_subscriber::fmt::layer();

    let otel_resources = Resource::new([
        KeyValue::new(SERVICE_NAME, built_info::PKG_NAME),
        KeyValue::new(SERVICE_VERSION, built_info::PKG_VERSION),
    ]);

    let metrics_layer = if let Some(metrics_endpoint) = metrics_endpoint {
        Some(MetricsLayer::new(
            new_pipeline()
                .metrics(runtime::Tokio)
                .with_exporter(new_exporter().tonic().with_endpoint(metrics_endpoint))
                .with_resource(otel_resources.clone())
                .with_period(Duration::from_secs(10))
                .build()?,
        ))
    } else {
        None
    };

    let tracing_layer = if let Some(tracing_endpoint) = tracing_endpoint {
        Some(OpenTelemetryLayer::new(
            new_pipeline()
                .tracing()
                .with_exporter(new_exporter().tonic().with_endpoint(tracing_endpoint))
                .with_trace_config(Config::default().with_resource(otel_resources))
                .install_batch(runtime::Tokio)?,
        ))
    } else {
        None
    };

    opentelemetry::global::set_text_map_propagator(TraceContextPropagator::default());
    tracing_subscriber::Registry::default()
        .with(level_filter)
        .with(log_layer)
        .with(metrics_layer)
        .with(tracing_layer)
        .try_init()?;
    Ok(())
}
