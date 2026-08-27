require('dotenv').config();

const path = require('path');
const express = require('express');
const amqp = require('amqplib');

const app = express();
const PORT = process.env.PORT || 3002;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const TOPIC_EXCHANGE = 'demo.topic';
const ROUTING_KEY = 'demo.message.requested';

let channelPromise;

async function getRabbitChannel() {
  if (!channelPromise) {
    channelPromise = amqp.connect(RABBITMQ_URL)
      .then(async (connection) => {
        connection.on('error', (err) => {
          console.error('RabbitMQ connection error:', err.message);
        });

        connection.on('close', () => {
          console.warn('RabbitMQ connection closed');
          channelPromise = undefined;
        });

        const channel = await connection.createChannel();
        await channel.assertExchange(TOPIC_EXCHANGE, 'topic', { durable: true });
        return channel;
      })
      .catch((err) => {
        channelPromise = undefined;
        throw err;
      });
  }

  return channelPromise;
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/message', async (req, res) => {
  const event = {
    type: 'message.requested',
    message: [
      { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965 },
      { id: 2, title: '1984', author: 'George Orwell', year: 1949 },
      { id: 3, title: 'The Hobbit', author: 'J.R.R. Tolkien', year: 1937 },
    ],
    requestedAt: new Date().toISOString(),
  };

  try {
    const channel = await getRabbitChannel();
    channel.publish(
      TOPIC_EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(event)),
      {
        contentType: 'application/json',
        persistent: true,
      },
    );

    res.json({
      message: event.message,
      rabbitmq: {
        exchange: TOPIC_EXCHANGE,
        exchangeType: 'topic',
        routingKey: ROUTING_KEY,
        published: true,
      },
    });
  } catch (err) {
    console.error('Failed to publish RabbitMQ message:', err.message);
    res.status(503).json({
      message: 'RabbitMQ is unavailable. Is it running?',
      rabbitmq: {
        exchange: TOPIC_EXCHANGE,
        exchangeType: 'topic',
        routingKey: ROUTING_KEY,
        published: false,
      },
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error(`Stop the existing backend or start this one with another port, for example: PORT=3012 npm start`);
    process.exit(1);
  }

  throw err;
});
