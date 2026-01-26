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
    pub graphql_request_latency_ms: Histogram<f64>,
}

impl Metrics {
    /// Builds a new metrics carrier instance
    pub fn new(meter_provider: &SdkMeterProvider) -> Self {
        let meter = meter_provider.meter("otel-proxy");

        let total_requests = meter
            .u64_counter("graph_proxy_total_requests")
            .with_description("The total requests on all routes made since the last restart.")
            .build();

        let graphql_request_latency_ms = meter
            .f64_histogram("graph_proxy_graphql_request_latency_ms")
            .with_description("GraphQL request latency")
            .with_unit("ms")
            .build();

        Metrics {
            total_requests,
            graphql_request_latency_ms,
        }
    }
}
