import Fastify from "fastify";
import { Kafka } from "kafkajs";

const fastify = Fastify();
const kafka = new Kafka({ clientId: "producer-service", brokers: ["kafka:9092"] });
const admin = kafka.admin();
const producer = kafka.producer();

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

// Initialize producer with retry logic
async function initializeProducer() {
  const maxRetries = 10;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Ensure topic exists
      await ensureTopicExists("test-topic");
      
      // Connect producer
      await producer.connect();
      console.log("🚀 Producer connected to Kafka");
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

// Start producer initialization
initializeProducer().catch(console.error);

// API endpoints
fastify.post("/send", async (req, reply) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return reply.code(400).send({ error: "Message is required" });
    }
    
    await producer.send({
      topic: "test-topic",
      messages: [{ value: message }],
    });
    
    console.log(`📤 Sent message: ${message}`);
    return { status: "sent", message, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("❌ Error sending message:", error);
    return reply.code(500).send({ error: "Failed to send message" });
  }
});

fastify.get("/health", async () => {
  return { status: "healthy", service: "producer" };
});

// Start API server
fastify.listen({ port: 3001, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("❌ Failed to start API server:", err);
    process.exit(1);
  }
  console.log("📡 Producer API running on http://localhost:3001");
});