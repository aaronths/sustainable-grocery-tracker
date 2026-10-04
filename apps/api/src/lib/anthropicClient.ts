import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

/** Lazy singleton so importing this module never throws when no key is set
 * (e.g. in tests, where the parser that uses it is mocked anyway). */
export function getAnthropicClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
