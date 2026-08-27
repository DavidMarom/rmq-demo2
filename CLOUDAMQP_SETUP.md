# Using CloudAMQP (LavinMQ) instead of local RabbitMQ

This repo's backend connects to whatever broker `RABBITMQ_URL` points to
([backend/server.js](backend/server.js)). It defaults to a local broker
(`amqp://localhost`), but you registered for a managed CloudAMQP instance
(a LavinMQ broker at `swallow.lmq.cloudamqp.com`), and this doc walks
through pointing the backend at it instead.

## What you need to do

### 1. Get your connection URL from the CloudAMQP console

1. Log in at [customer.cloudamqp.com](https://customer.cloudamqp.com).
2. Open your `swallow` instance from the instance list.
3. On the instance **Details** page you'll see an **AMQP URL** field. It's
   pre-assembled in this form:

   ```
   amqps://<username>:<password>@swallow.lmq.cloudamqp.com/<vhost>
   ```

   The same page also lists the username, password, and vhost individually
   if you need them separately — for this repo you just need the full URL.

   Note the scheme: `amqps://`, not `amqp://`. CloudAMQP/LavinMQ requires
   TLS. `amqplib` (the library this backend uses) picks up TLS
   automatically from the `amqps://` scheme — no code changes needed on
   your end for that part.

### 2. Put the URL in `backend/.env`

A template already exists at [backend/.env.example](backend/.env.example).
Copy it and fill in the real URL:

```sh
cp backend/.env.example backend/.env
```

Then edit `backend/.env` and replace the placeholder with the AMQP URL you
copied in step 1:

```
RABBITMQ_URL=amqps://<username>:<password>@swallow.lmq.cloudamqp.com/<vhost>
```

`backend/.env` is already covered by the root [.gitignore](.gitignore), so
your credentials won't be committed.

### 3. Install dependencies and start the backend

```sh
cd backend
npm install
npm start
```

`npm install` picks up the new `dotenv` dependency, which loads
`backend/.env` automatically when the server starts
([backend/server.js:1](backend/server.js#L1)).

### 4. Verify it worked

```sh
curl http://localhost:3002/api/message
```

You should get back:

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

To confirm the message actually reached CloudAMQP (not just that the local
server didn't crash), open the LavinMQ management UI in your browser —
`https://swallow.lmq.cloudamqp.com` — and log in with the same
username/password from step 1. After calling the route at least once,
you should see the `demo.topic` exchange listed there.

## Falling back to local RabbitMQ

If you ever want to go back to a local broker, just delete or rename
`backend/.env` (or comment out `RABBITMQ_URL`) and follow the Docker
instructions in [RABBITMQ_TOPIC_EXCHANGE.md](RABBITMQ_TOPIC_EXCHANGE.md).
The two setups aren't mutually exclusive — `RABBITMQ_URL` just decides
which one the backend talks to on a given run.
