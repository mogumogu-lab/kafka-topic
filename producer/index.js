import Fastify from "fastify";
import { Kafka } from "kafkajs";

const fastify = Fastify();
const kafka = new Kafka({ clientId: "producer-service", brokers: ["kafka:9092"] });
const producer = kafka.producer();

await producer.connect();
console.log("🚀 Producer connected to Kafka");

fastify.post("/send", async (req, reply) => {
  const { message } = req.body;
  await producer.send({
    topic: "test-topic",
    messages: [{ value: message }],
  });
  return { status: "sent", message };
});

fastify.listen({ port: 3001, host: "0.0.0.0" }, () => {
  console.log("📡 Producer API running on http://localhost:3001");
});