import Fastify from "fastify";
import { Kafka } from "kafkajs";

const fastify = Fastify();
const kafka = new Kafka({ clientId: "consumer-service", brokers: ["kafka:9092"] });
const admin = kafka.admin();
const consumer = kafka.consumer({ groupId: "test-group" });

let receivedMessages = [];

// Function to ensure topic exists
async function ensureTopicExists(topicName) {
  try {
    await admin.connect();
    const topics = await admin.listTopics();
    
    if (!topics.includes(topicName)) {
      console.log(`📝 Creating topic: ${topicName}`);
      await admin.createTopics({
        topics: [{
          topic: topicName,
          numPartitions: 1,
          replicationFactor: 1
        }]
      });
      console.log(`✅ Topic ${topicName} created successfully`);
    } else {
      console.log(`✅ Topic ${topicName} already exists`);
    }
  } catch (error) {
    console.error("Error ensuring topic exists:", error);
    throw error;
  } finally {
    await admin.disconnect();
  }
}

// Initialize with retry logic
async function initializeConsumer() {
  const maxRetries = 10;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Ensure topic exists
      await ensureTopicExists("test-topic");
      
      // Connect consumer
      await consumer.connect();
      console.log("🚀 Consumer connected to Kafka");
      
      // Subscribe to topic
      await consumer.subscribe({ topic: "test-topic", fromBeginning: true });
      console.log("📬 Subscribed to test-topic");
      
      // Start consuming
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const msg = message.value.toString();
          console.log(`📩 Received: ${msg}`);
          receivedMessages.push(msg);
        },
      });
      
      console.log("✅ Consumer is running");
      break;
    } catch (error) {
      retries++;
      console.log(`⏳ Retry ${retries}/${maxRetries} - Waiting for Kafka...`);
      console.error("Error:", error.message);
      
      if (retries >= maxRetries) {
        console.error("❌ Failed to connect to Kafka after maximum retries");
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start consumer initialization
initializeConsumer().catch(console.error);

// API endpoints
fastify.get("/messages", async () => {
  return { messages: receivedMessages };
});

fastify.get("/health", async () => {
  return { status: "healthy", messagesReceived: receivedMessages.length };
});

// Start API server
fastify.listen({ port: 3002, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("❌ Failed to start API server:", err);
    process.exit(1);
  }
  console.log("📡 Consumer API running on http://localhost:3002");
});