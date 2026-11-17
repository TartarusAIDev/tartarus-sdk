import { TartarusClient } from "tartarus-sdk";

const client = new TartarusClient(); // reads TARTARUS_TOKEN from the environment

// Non-streaming
const res = await client.chat({
  messages: [{ role: "user", content: "Write a Rust function to reverse a singly linked list." }],
});
console.log(res.choices[0].message.content);

// Streaming
process.stdout.write("\n--- streaming ---\n");
for await (const text of client.streamText({
  messages: [{ role: "user", content: "Now explain that code line by line." }],
})) {
  process.stdout.write(text);
}
process.stdout.write("\n");
