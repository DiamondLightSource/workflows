use std::sync::Arc;

use opentelemetry::metrics::{Counter, MeterProvider};
use opentelemetry_sdk::metrics::SdkMeterProvider;

/// Thread-safe wrapper for OTEL metrics
pub type MetricsState = Arc<Metrics>;

/// OTEL metrics carrier. Accessible in top-level handlers and schema routes
#[derive(Clone, Debug)]
pub struct Metrics {
    /// Total requests on all routes
    pub total_requests: Counter<u64>,
}

impl Metrics {
    /// Builds a new metrics carrier instance
    pub fn new(meter_provider: &SdkMeterProvider) -> Self {
        let meter = meter_provider.meter("otel-proxy");

        let total_requests = meter
            .u64_counter("graph_proxy_total_requests")
            .with_description("The total requests on all routes made since the last restart.")
            .build();

        Metrics { total_requests }
    }
}
