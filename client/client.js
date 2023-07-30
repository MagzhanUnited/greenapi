const express = require("express");
const app = express();
app.use(express.json());

var amqp = require("amqplib");
var channel, connection;

app.post("/solvemath", async function (req, res) {
  try {
    const digit = req.body["digit"];
    const result = await solvemath(digit);
    res.send(result);
  } catch (error) {
    res.status(500).send("Error while solving math: " + error.message);
  }
});

setupAMQP().then(() => {
  app.listen("4001", () => console.log("Server running at port 4001"));
});

async function solvemath(digit) {
  var correlationId = generateUuid();
  return new Promise(async (resolve, reject) => {
    var result;
    channel.assertQueue("client-queue");
    channel.consume(
      "client-queue",
      function (msg) {
        if (msg.properties.correlationId === correlationId) {
          console.log("Got %s", msg.content.toString());
          result = msg.content.toString();
          connection.close();
          resolve(result);
        }
      },
      {
        noAck: true,
      }
    );
    const content = Buffer.from(digit.toString()); // Convert the number to a buffer
    channel.sendToQueue("rpc_queue", content, {
      correlationId: correlationId,
      replyTo: "client-queue",
    });
  });
}

function generateUuid() {
  return (
    Math.random().toString() +
    Math.random().toString() +
    Math.random().toString()
  );
}
async function setupAMQP() {
  try {
    connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();
    channel.assertQueue("client-queue");
  } catch (error) {
    console.error("Error while setting up AMQP:", error);
  }
}
