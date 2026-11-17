import { TartarusClient, type Tool } from "tartarus-sdk";

const client = new TartarusClient();

const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "run_shell",
      description: "Run a shell command and return its stdout.",
      parameters: {
        type: "object",
        properties: { cmd: { type: "string" } },
        required: ["cmd"],
      },
    },
  },
];

const res = await client.chat({
  messages: [{ role: "user", content: "List the TypeScript files here using the tool." }],
  tools,
});

for (const call of res.choices[0].message.tool_calls ?? []) {
  console.log(`${call.function.name}(${call.function.arguments})`);
}
