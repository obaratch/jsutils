import CachedAction from "../src/cachedAction";

describe("cachedAction", () => {
  it("should execute non-promise immediately", async () => {
    let cachedAction = new CachedAction(() => 1);
    let result = await cachedAction.execute();
    expect(result.value).toBe(1);
  });

  it("should execute promise", async () => {
    let cachedAction = new CachedAction(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(1));
        })
    );
    let result = await cachedAction.execute();
    expect(result.value).toBe(1);
  });

  it("should return cache if in time", async () => {
    let cachedAction = new CachedAction(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(1));
        }, 100)
    );
    let result1 = await cachedAction.execute();
    expect(result1._meta.isCache).toBeFalsy();
    expect(result1.value).toBe(1);

    let result2 = await cachedAction.execute();
    expect(result2._meta.isCache).toBeTruthy();
    expect(result2.value).toBe(1);
  });

  it("should return new value if too late", async () => {
    let counter = 0;
    let cachedAction = new CachedAction(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(++counter));
        }, 0),
      { keepAlive: 100 } // cache dies in 100ms
    );
    let result1 = await cachedAction.execute();
    expect(result1._meta.isCache).toBeFalsy();
    expect(result1.value).toBe(1);

    // 200ms later
    setTimeout(async () => {
      let result2 = await cachedAction.execute();
      expect(result2._meta.isCache).toBeFalsy();
      expect(result2.value).toBe(2);
    }, 200);
  });

  it("should handle simultanious requests", async () => {
    let cachedAction = new CachedAction(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(1));
        }, 100)
    );
    let p1 = cachedAction.execute();
    let p2 = cachedAction.execute();
    let p3 = cachedAction.execute();
    Promise.all([p1, p2, p3]).then((r1, r2, r3) => {
      expect(r1._meta.isCache).toBeFalsy();
      expect(r1.value).toBe(1);
      expect(r2._meta.isCache).toBeTruthy();
      expect(r2.value).toBe(1);
      expect(r3._meta.isCache).toBeTruthy();
      expect(r3.value).toBe(1);
    });
  });
});
