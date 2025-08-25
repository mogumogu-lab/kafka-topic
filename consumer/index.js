import Fastify from "fastify";
import { Kafka } from "kafkajs";

const fastify = Fastify();
const kafka = new Kafka({ clientId: "consumer-service", brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "test-group" });

let receivedMessages = [];

await consumer.connect();
await consumer.subscribe({ topic: "test-topic", fromBeginning: true });

consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const msg = message.value.toString();
    console.log(`📩 Received: ${msg}`);
    receivedMessages.push(msg);
  },
});

fastify.get("/messages", async () => {
  return { messages: receivedMessages };
});

fastify.listen({ port: 3002, host: "0.0.0.0" }, () => {
  console.log("📡 Consumer API running on http://localhost:3002");
});