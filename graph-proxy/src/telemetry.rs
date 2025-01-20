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
use tracing::{level_filters::LevelFilter, Level};
use tracing_opentelemetry::{MetricsLayer, OpenTelemetryLayer};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use url::Url;

/// Provides crate information from the time it was built
mod built_info {
    include!(concat!(env!("OUT_DIR"), "/built.rs"));
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
                eprintln!("{err:?}");
            }
        }
        if let Some(meter_provider) = &self.meter_provider {
            if let Err(err) = meter_provider.shutdown() {
                eprintln!("{err}:?");
            }
        }
    }
}

/// Sets up Logging & Tracing using opentelemetry if available
pub fn setup_telemetry(
    metrics_endpoint: Option<Url>,
    tracing_endpoint: Option<Url>,
    telemetry_level: Level,
) -> anyhow::Result<OtelGuard> {
    let level_filter = LevelFilter::from_level(telemetry_level);
    let log_layer = tracing_subscriber::fmt::layer();

    let otel_resources = Resource::new([
        KeyValue::new(SERVICE_NAME, built_info::PKG_NAME),
        KeyValue::new(SERVICE_VERSION, built_info::PKG_VERSION),
    ]);

    let (meter_provider, metrics_layer) = if let Some(metrics_endpoint) = metrics_endpoint {
        let meter_provider = SdkMeterProvider::builder()
            .with_reader(
                PeriodicReader::builder(
                    MetricExporter::builder()
                        .with_tonic()
                        .with_endpoint(metrics_endpoint)
                        .build()?,
                    runtime::Tokio,
                )
                .build(),
            )
            .with_resource(otel_resources.clone())
            .build();
        (
            Some(meter_provider.clone()),
            Some(MetricsLayer::new(meter_provider)),
        )
    } else {
        (None, None)
    };

    let (tracer_provider, tracing_layer) = if let Some(tracing_endpoint) = tracing_endpoint {
        let tracer_provider = TracerProvider::builder()
            .with_batch_exporter(
                SpanExporter::builder()
                    .with_tonic()
                    .with_endpoint(tracing_endpoint)
                    .build()?,
                runtime::Tokio,
            )
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
