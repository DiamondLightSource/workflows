use std::sync::Arc;

use opentelemetry::metrics::{Counter, Histogram, MeterProvider};
use opentelemetry_sdk::metrics::SdkMeterProvider;

/// Thread-safe wrapper for OTEL metrics
pub type MetricsState = Arc<Metrics>;

/// OTEL metrics carrier. Accessible in top-level handlers and schema routes
#[derive(Clone, Debug)]
pub struct Metrics {
    /// Total requests on all routes
    pub total_requests: Counter<u64>,
    /// Request duration in miliseconds on every request
    pub request_duration_ms: Histogram<f64>,
    pub total_errors: Counter<u64>,
}

impl Metrics {
    /// Builds a new metrics carrier instance
    pub fn new(meter_provider: &SdkMeterProvider) -> Self {
        let meter = meter_provider.meter("otel-proxy");

        let total_requests = meter
            .u64_counter("graph_proxy_total_requests")
            .with_description("The total requests on all routes made since the last restart.")
            .build();

        let request_duration_ms = meter
            .f64_histogram("graph_proxy_request_duration_ms")
            .with_description("GraphQL request duration")
            .with_unit("ms")
            .build();

        let total_errors = meter
            .u64_counter("graph_proxy_total_errors")
            .with_description("The total number of errors since the last restart.")
            .build();

        Metrics {
            total_requests,
            request_duration_ms,
            total_errors,
        }
    }
}
