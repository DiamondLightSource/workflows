#![allow(dead_code)]
#![allow(clippy::missing_docs_in_private_items)]
// async-graphql provide integrations with each rust
// web-server library. This is largely built around the
// axum integration found here:
// https://github.com/async-graphql/async-graphql/blob/master/integrations/axum/src/subscription.rs
//
// The library does not ship with these integrations as it
// attemps to be web-server-independant, so this must be
// added explicitly.
//
// The code is largely the same, but some logic has been
// added around the auth tokens to make these tokens
// accessible inside the graph functions - after upgrading
// requests to websocket, which is not natively supported.

use std::{convert::Infallible, future::Future, str::FromStr, time::Duration};

use async_graphql::{
    futures_util::task::{Context, Poll},
    http::{
        default_on_connection_init, default_on_ping, DefaultOnConnInitType, DefaultOnPingType,
        WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS,
    },
    Data, Executor, Result,
};
use axum::{
    body::{Body, HttpBody},
    extract::{
        ws::{CloseFrame, Message},
        FromRequestParts, WebSocketUpgrade,
    },
    http::{self, request::Parts, Request, Response, StatusCode},
    response::IntoResponse,
    Error,
};
use axum_extra::headers::Authorization;
use futures_util::{
    future,
    future::BoxFuture,
    stream::{SplitSink, SplitStream},
    Sink, SinkExt, Stream, StreamExt,
};
use tower_service::Service;

/// A GraphQL protocol extractor.
///
/// It extract GraphQL protocol from `SEC_WEBSOCKET_PROTOCOL` header.
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub struct GraphQLProtocol(WebSocketProtocols);

impl<S> FromRequestParts<S> for GraphQLProtocol
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .headers
            .get(http::header::SEC_WEBSOCKET_PROTOCOL)
            .and_then(|value| value.to_str().ok())
            .and_then(|protocols| {
                protocols
                    .split(',')
                    .find_map(|p| WebSocketProtocols::from_str(p.trim()).ok())
            })
            .map(Self)
            .ok_or(StatusCode::BAD_REQUEST)
    }
}

/// A GraphQL subscription service.
pub struct GraphQLSubscription<E> {
    executor: E,
}

impl<E> Clone for GraphQLSubscription<E>
where
    E: Executor,
{
    fn clone(&self) -> Self {
        Self {
            executor: self.executor.clone(),
        }
    }
}

impl<E> GraphQLSubscription<E>
where
    E: Executor,
{
    /// Create a GraphQL subscription service.
    pub fn new(executor: E) -> Self {
        Self { executor }
    }
}

impl<B, E> Service<Request<B>> for GraphQLSubscription<E>
where
    B: HttpBody + Send + 'static,
    E: Executor,
{
    type Response = Response<Body>;
    type Error = Infallible;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<B>) -> Self::Future {
        let executor = self.executor.clone();

        Box::pin(async move {
            let (mut parts, _body) = req.into_parts();

            let protocol = match GraphQLProtocol::from_request_parts(&mut parts, &()).await {
                Ok(protocol) => protocol,
                Err(err) => return Ok(err.into_response()),
            };

            let upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
                Ok(upgrade) => upgrade,
                Err(err) => return Ok(err.into_response()),
            };

            let executor = executor.clone();

            let resp = upgrade
                .protocols(ALL_WEBSOCKET_PROTOCOLS)
                .on_upgrade(move |stream| {
                    let websocket = GraphQLWebSocket::new(stream, executor, protocol)
                        .on_connection_init(|value: serde_json::Value| async move {
                            let token = value
                                .get("Authorization")
                                .and_then(|value| value.as_str())
                                .and_then(|token| token.strip_prefix("Bearer "))
                                .map(str::to_string)
                                .ok_or(async_graphql::Error::new("No auth token was provided"))?;

                            let auth_header = Authorization::bearer(&token);
                            match auth_header {
                                Ok(header) => {
                                    let mut data = Data::default();
                                    data.insert(Some(header));
                                    Ok(data)
                                }
                                Err(_e) => {
                                    Err(async_graphql::Error::new("No auth token was provided"))
                                }
                            }
                        });

                    websocket.serve()
                });

            Ok(resp.into_response())
        })
    }
}

/// A Websocket connection for GraphQL subscription.
pub struct GraphQLWebSocket<Sink, Stream, E, OnConnInit, OnPing> {
    sink: Sink,
    stream: Stream,
    executor: E,
    data: Data,
    on_connection_init: OnConnInit,
    on_ping: OnPing,
    protocol: GraphQLProtocol,
    keepalive_timeout: Option<Duration>,
}

impl<S, E>
    GraphQLWebSocket<
        SplitSink<S, Message>,
        SplitStream<S>,
        E,
        DefaultOnConnInitType,
        DefaultOnPingType,
    >
where
    S: Stream<Item = Result<Message, Error>> + Sink<Message>,
    E: Executor,
{
    /// Create a [`GraphQLWebSocket`] object.
    pub fn new(stream: S, executor: E, protocol: GraphQLProtocol) -> Self {
        let (sink, stream) = stream.split();
        GraphQLWebSocket::new_with_pair(sink, stream, executor, protocol)
    }
}

impl<Sink, Stream, E> GraphQLWebSocket<Sink, Stream, E, DefaultOnConnInitType, DefaultOnPingType>
where
    Sink: futures_util::sink::Sink<Message>,
    Stream: futures_util::stream::Stream<Item = Result<Message, Error>>,
    E: Executor,
{
    /// Create a [`GraphQLWebSocket`] object with sink and stream objects.
    pub fn new_with_pair(
        sink: Sink,
        stream: Stream,
        executor: E,
        protocol: GraphQLProtocol,
    ) -> Self {
        GraphQLWebSocket {
            sink,
            stream,
            executor,
            data: Data::default(),
            on_connection_init: default_on_connection_init,
            on_ping: default_on_ping,
            protocol,
            keepalive_timeout: None,
        }
    }
}

impl<Sink, Stream, E, OnConnInit, OnConnInitFut, OnPing, OnPingFut>
    GraphQLWebSocket<Sink, Stream, E, OnConnInit, OnPing>
where
    Sink: futures_util::sink::Sink<Message>,
    Stream: futures_util::stream::Stream<Item = Result<Message, Error>>,
    E: Executor,
    OnConnInit: FnOnce(serde_json::Value) -> OnConnInitFut + Send + 'static,
    OnConnInitFut: Future<Output = async_graphql::Result<Data>> + Send + 'static,
    OnPing: FnOnce(Option<&Data>, Option<serde_json::Value>) -> OnPingFut + Clone + Send + 'static,
    OnPingFut: Future<Output = async_graphql::Result<Option<serde_json::Value>>> + Send + 'static,
{
    /// Specify the initial subscription context data, usually you can get
    /// something from the incoming request to create it.
    #[must_use]
    pub fn with_data(self, data: Data) -> Self {
        Self { data, ..self }
    }

    /// Specify a callback function to be called when the connection is
    /// initialized.
    ///
    /// You can get something from the payload of [`GQL_CONNECTION_INIT` message](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md#gql_connection_init) to create [`Data`].
    /// The data returned by this callback function will be merged with the data
    /// specified by [`with_data`].
    #[must_use]
    pub fn on_connection_init<F, R>(
        self,
        callback: F,
    ) -> GraphQLWebSocket<Sink, Stream, E, F, OnPing>
    where
        F: FnOnce(serde_json::Value) -> R + Send + 'static,
        R: Future<Output = async_graphql::Result<Data>> + Send + 'static,
    {
        GraphQLWebSocket {
            sink: self.sink,
            stream: self.stream,
            executor: self.executor,
            data: self.data,
            on_connection_init: callback,
            on_ping: self.on_ping,
            protocol: self.protocol,
            keepalive_timeout: self.keepalive_timeout,
        }
    }

    /// Specify a ping callback function.
    ///
    /// This function if present, will be called with the data sent by the
    /// client in the [`Ping` message](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md#ping).
    ///
    /// The function should return the data to be sent in the [`Pong` message](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md#pong).
    ///
    /// NOTE: Only used for the `graphql-ws` protocol.
    #[must_use]
    pub fn on_ping<F, R>(self, callback: F) -> GraphQLWebSocket<Sink, Stream, E, OnConnInit, F>
    where
        F: FnOnce(Option<&Data>, Option<serde_json::Value>) -> R + Clone + Send + 'static,
        R: Future<Output = Result<Option<serde_json::Value>>> + Send + 'static,
    {
        GraphQLWebSocket {
            sink: self.sink,
            stream: self.stream,
            executor: self.executor,
            data: self.data,
            on_connection_init: self.on_connection_init,
            on_ping: callback,
            protocol: self.protocol,
            keepalive_timeout: self.keepalive_timeout,
        }
    }

    /// Sets a timeout for receiving an acknowledgement of the keep-alive ping.
    ///
    /// If the ping is not acknowledged within the timeout, the connection will
    /// be closed.
    ///
    /// NOTE: Only used for the `graphql-ws` protocol.
    #[must_use]
    pub fn keepalive_timeout(self, timeout: impl Into<Option<Duration>>) -> Self {
        Self {
            keepalive_timeout: timeout.into(),
            ..self
        }
    }

    /// Processing subscription requests.
    pub async fn serve(self) {
        let input = self
            .stream
            .take_while(|res| future::ready(res.is_ok()))
            .map(Result::unwrap)
            .filter_map(|msg| {
                if let Message::Text(_) | Message::Binary(_) = msg {
                    future::ready(Some(msg))
                } else {
                    future::ready(None)
                }
            })
            .map(Message::into_data);

        let stream =
            async_graphql::http::WebSocket::new(self.executor.clone(), input, self.protocol.0)
                .connection_data(self.data)
                .on_connection_init(self.on_connection_init)
                .on_ping(self.on_ping.clone())
                .keepalive_timeout(self.keepalive_timeout)
                .map(|msg| match msg {
                    WsMessage::Text(text) => Message::Text(text.into()),
                    WsMessage::Close(code, status) => Message::Close(Some(CloseFrame {
                        code,
                        reason: status.into(),
                    })),
                });

        let sink = self.sink;
        futures_util::pin_mut!(stream, sink);

        while let Some(item) = stream.next().await {
            if sink.send(item).await.is_err() {
                break;
            }
        }
    }
}
