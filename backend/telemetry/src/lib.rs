use opentelemetry::{trace::TracerProvider as _, KeyValue};
use opentelemetry_otlp::{MetricExporter, SpanExporter, WithExportConfig};
use opentelemetry_sdk::{
    metrics::{PeriodicReader, SdkMeterProvider},
    propagation::TraceContextPropagator,
    runtime,
    trace::TracerProvider,
    Resource,
};
use opentelemetry_semantic_conventions::resource::{SERVICE_NAME, SERVICE_VERSION};
use thiserror::Error;
use tracing::{level_filters::LevelFilter, Level};
use tracing_opentelemetry::{MetricsLayer, OpenTelemetryLayer};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use url::Url;

/// Provides crate information from the time it was built
mod built_info {
    include!(concat!(env!("OUT_DIR"), "/built.rs"));
}

#[derive(Debug, Error)]
pub enum TelemetryError {
    #[error("Metric error: {0}")]
    MetricError(#[from] opentelemetry_sdk::metrics::MetricError),
    #[error("Trace error: {0}")]
    TraceError(#[from] opentelemetry::trace::TraceError),
    #[error("Tracing Subscriber initialization error: {0}")]
    TracingSubscriberInitError(#[from] tracing_subscriber::util::TryInitError),
}

/// Encapsulates a [`TracerProvider`] and [`SdkMeterProvider`] to ensure metrics & trace streams
/// are shutdown and flushed on drop
#[allow(clippy::missing_docs_in_private_items)]
pub struct OtelGuard {
    tracer_provider: Option<TracerProvider>,
    meter_provider: Option<SdkMeterProvider>,
}

impl Drop for OtelGuard {
    fn drop(&mut self) {
        if let Some(tracer_provider) = &self.tracer_provider {
            if let Err(err) = tracer_provider.shutdown() {
                eprintln!("{}", TelemetryError::TraceError(err));
            }
        }
        if let Some(meter_provider) = &self.meter_provider {
            if let Err(err) = meter_provider.shutdown() {
                eprintln!("{}", TelemetryError::MetricError(err));
            }
        }
    }
}

#[derive(clap::Parser, Clone, Debug)]
pub struct TelemetryConfig {
    /// The endpoint to send OTLP metrics to
    #[arg(short, long, env = "METRICS_ENDPOINT")]
    pub metrics_endpoint: Option<Url>,
    /// The endpoint to send OTLP traces to
    #[arg(short, long, env = "TRACING_ENDPOINT")]
    pub tracing_endpoint: Option<Url>,
    /// The minimum telemetry level
    #[arg(short, long, env="TELEMETRY_LEVEL", default_value_t=Level::INFO)]
    pub telemetry_level: Level,
}

/// Sets up Logging & Tracing using opentelemetry if available
pub fn setup_telemetry(config: TelemetryConfig) -> Result<OtelGuard, TelemetryError> {
    let level_filter = LevelFilter::from_level(config.telemetry_level);
    let log_layer = tracing_subscriber::fmt::layer();

    let otel_resources = Resource::new([
        KeyValue::new(SERVICE_NAME, built_info::PKG_NAME),
        KeyValue::new(SERVICE_VERSION, built_info::PKG_VERSION),
    ]);

    let (meter_provider, metrics_layer) = if let Some(metrics_endpoint) = config.metrics_endpoint {
        let exporter = MetricExporter::builder()
            .with_tonic()
            .with_endpoint(metrics_endpoint)
            .build()?;
        let meter_provider = SdkMeterProvider::builder()
            .with_reader(PeriodicReader::builder(exporter, runtime::Tokio).build())
            .with_resource(otel_resources.clone())
            .build();
        (
            Some(meter_provider.clone()),
            Some(MetricsLayer::new(meter_provider)),
        )
    } else {
        (None, None)
    };

    let (tracer_provider, tracing_layer) = if let Some(tracing_endpoint) = config.tracing_endpoint {
        let exporter = SpanExporter::builder()
            .with_tonic()
            .with_endpoint(tracing_endpoint)
            .build()?;
        let tracer_provider = TracerProvider::builder()
            .with_batch_exporter(exporter, runtime::Tokio)
            .with_resource(otel_resources)
            .build();
        let tracer = tracer_provider.tracer(built_info::PKG_NAME);
        (Some(tracer_provider), Some(OpenTelemetryLayer::new(tracer)))
    } else {
        (None, None)
    };

    let otel_guard = OtelGuard {
        tracer_provider,
        meter_provider,
    };

    opentelemetry::global::set_text_map_propagator(TraceContextPropagator::default());
    tracing_subscriber::Registry::default()
        .with(level_filter)
        .with(log_layer)
        .with(metrics_layer)
        .with(tracing_layer)
        .try_init()?;
    Ok(otel_guard)
}
