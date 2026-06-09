import { XaiExecutor } from "../../../open-sse/executors/xai.js";

describe("XaiExecutor suffix parsing", () => {
  const exec = new XaiExecutor();

  test("parses -high suffix and strips it from model", () => {
    const body = { model: "grok-4-high", messages: [] };
    const out = exec.transformRequest("xai/grok-4-high", body);
    expect(out.model).toBe("grok-4");
    expect(out.reasoning_effort).toBe("high");
  });

  test("parses -low suffix", () => {
    const body = { model: "grok-4.3-low", messages: [] };
    const out = exec.transformRequest("xai/grok-4.3-low", body);
    expect(out.model).toBe("grok-4.3");
    expect(out.reasoning_effort).toBe("low");
  });
});
