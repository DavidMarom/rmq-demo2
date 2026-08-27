# RabbitMQ Topic Exchange Walkthrough

This demo keeps the existing `GET /api/message` route, but the route now also publishes an event to RabbitMQ.

## What changed

The backend now uses `amqplib`, the standard Node.js client for RabbitMQ:

```js
const amqp = require('amqplib');
```

When `GET /api/message` is called, the backend:

1. Connects to RabbitMQ at `RABBITMQ_URL`, or `amqp://localhost` by default.
2. Creates a channel.
3. Declares a topic exchange named `demo.topic`.
4. Publishes a JSON event with the routing key `demo.message.requested`.
5. Responds to the browser with the original message and publish metadata.

## RabbitMQ concepts in this demo

### Connection

A connection is the TCP connection from this Node app to RabbitMQ.

This project uses:

```txt
amqp://localhost
```

You can override it:

```sh
RABBITMQ_URL=amqp://user:password@host:5672 npm start
```

### Channel

A channel is a lightweight communication path inside a connection.

Most RabbitMQ work happens through a channel: declaring exchanges, publishing messages, creating queues, and binding queues.

### Exchange

An exchange receives messages from publishers.

This demo declares:

```txt
demo.topic
```

The exchange type is:

```txt
topic
```

### Topic Exchange

A topic exchange routes messages by matching routing keys against binding patterns.

This route publishes with:

```txt
demo.message.requested
```

Useful binding examples:

```txt
demo.message.requested
demo.message.*
demo.#
```

Pattern rules:

```txt
* matches exactly one word
# matches zero or more words
```

So `demo.message.*` matches `demo.message.requested`, but not `demo.message.requested.today`.

`demo.#` matches both.

### Queue

An exchange does not store messages by itself. Queues store messages.

To see messages from this demo, create a queue and bind it to `demo.topic` with a matching pattern.

For example, bind a queue named `message-events` with:

```txt
demo.message.*
```

Then every request to `/api/message` will publish an event that can be routed into that queue.

## Running RabbitMQ locally

One easy way is Docker:

```sh
docker run --rm --name rabbitmq-demo \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

RabbitMQ will be available to the app at:

```txt
amqp://localhost
```

The management UI will be available at:

```txt
http://localhost:15672
```

Default login:

```txt
guest / guest
```

## Trying the route

Start the backend:

```sh
cd backend
npm start
```

If port `3002` is already in use:

```sh
PORT=3012 npm start
```

Or find and stop the old process using port `3002`:

```sh
lsof -nP -iTCP:3002 -sTCP:LISTEN
kill <PID>
```

Call the route:

```sh
curl http://localhost:3002/api/message
```

Expected successful shape:

```json
{
  "message": "Hello from the backend!",
  "rabbitmq": {
    "exchange": "demo.topic",
    "exchangeType": "topic",
    "routingKey": "demo.message.requested",
    "published": true
  }
}
```

If RabbitMQ is not running, the backend returns a `503` response that tells you RabbitMQ is unavailable.

## Why this route uses a topic exchange

A direct exchange would route only by exact routing key.

A topic exchange lets you organize events with names like:

```txt
demo.message.requested
demo.message.created
demo.user.created
```

Then consumers can choose how specific they want to be:

```txt
demo.message.*   receives message events
demo.user.*      receives user events
demo.#           receives every demo event
```

That makes topic exchanges useful when you want one app to publish events and multiple consumers to subscribe to different slices of those events.
