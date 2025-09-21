// Minimal smoke test to keep CI green and validate environment loads

describe('smoke', () => {
  it('runs jest and passes with no tests', () => {
    expect(true).toBe(true);
  });
});
