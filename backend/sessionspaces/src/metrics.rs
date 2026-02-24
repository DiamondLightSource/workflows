use std::sync::Arc

use opentelemetry::metrics::{Counter, Histogram, MeterProvider};

/// Thread-safe wrapper for OTEL metrics
pub type MetricsState = Arc<Metrics>;

#[derive(Clone, Debug)]
pub struct Metrics {
    /// Total namespace created
    pub total_namespaces_created: Counter<u64>,
}

impl Metrics {
    pub fn new(meter_provider: &impl MeterProvider) -> Self {
        let meter = meter_provider.meter("otel-proxy");

        let total_namespaces_created = meter
            .u64_counter("sessionspace_total_namespace_created")
            .with_description("The total namespace created since last restart.")
            .build();

        Metrics {
            total_namespaces_created,
        }
    }
}
