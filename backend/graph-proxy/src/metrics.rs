use std::sync::Arc;

use opentelemetry::metrics::{Counter, Histogram, MeterProvider};

/// Thread-safe wrapper for OTEL metrics
pub type MetricsState = Arc<Metrics>;

/// OTEL metrics carrier. Accessible in top-level handlers and schema routes
#[derive(Clone, Debug)]
pub struct Metrics {
    /// Total requests on all routes
    pub total_requests: Counter<u64>,
    /// Request duration in miliseconds on every request
    pub request_duration_ms: Histogram<f64>,
    /// Total errors on querys and mutations
    pub total_errors: Counter<u64>,
    /// Query depth
    pub query_depth: Histogram<u64>,
    /// Query complexity
    pub query_complexity: Histogram<u64>,
}

impl Metrics {
    /// Builds a new metrics carrier instance
    pub fn new(meter_provider: &impl MeterProvider) -> Self {
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
            .with_description("The total errors on all querys and mutations.")
            .build();

        let query_depth = meter
            .u64_histogram("graph_proxy_query_depth")
            .with_description("GraphQL query depth")
            .build();

        let query_complexity = meter
            .u64_histogram("graph_proxy_query_complexity")
            .with_description("GraphQL query complexity")
            .build();

        Metrics {
            total_requests,
            request_duration_ms,
            total_errors,
            query_depth,
            query_complexity,
        }
    }
}

#[cfg(test)]
pub mod noop {

    // Dummy metric provider for testing
    // This can be removed when https://github.com/open-telemetry/opentelemetry-rust/issues/2444
    // is included in next release of opentelemetry crate (after 0.31)
    use opentelemetry::metrics::{InstrumentProvider, Meter, MeterProvider};
    use std::sync::Arc;

    /// A no-op instance of a `MetricProvider`
    #[derive(Debug, Default)]
    pub struct NoopMeterProvider;

    impl NoopMeterProvider {
        /// Create a new no-op meter provider.
        pub fn new() -> Self {
            NoopMeterProvider
        }
    }

    impl MeterProvider for NoopMeterProvider {
        fn meter_with_scope(&self, _scope: opentelemetry::InstrumentationScope) -> Meter {
            Meter::new(Arc::new(NoopMeter::new()))
        }
    }

    /// A no-op instance of a `Meter`
    #[derive(Debug, Default)]
    struct NoopMeter;

    impl NoopMeter {
        /// Create a new no-op meter core.
        pub fn new() -> Self {
            NoopMeter
        }
    }

    impl InstrumentProvider for NoopMeter {}
}
