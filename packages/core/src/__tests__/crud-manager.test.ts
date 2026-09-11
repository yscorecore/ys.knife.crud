import { describe, expect, it } from "vitest";
import { CrudManager } from "../crud-manager";
import { MemoryDataSource } from "../memory-data-source";
import type { CrudEntity } from "../types";

interface User extends CrudEntity {
  id: number;
  name: string;
  email: string;
}

function createManager() {
  const source = new MemoryDataSource<User>("users", [
    { id: 1, name: "alice", email: "alice@example.com" },
    { id: 2, name: "bob", email: "bob@example.com" },
  ]);
  return { manager: new CrudManager(source), source };
}

describe("CrudManager", () => {
  it("creates an entity with a generated id", async () => {
    const { manager } = createManager();
    const created = await manager.create({ name: "carol", email: "carol@example.com" });
    expect(created.id).toBe(3);
    expect(created.name).toBe("carol");
  });

  it("reads an existing entity", async () => {
    const { manager } = createManager();
    const user = await manager.read(1);
    expect(user?.name).toBe("alice");
  });

  it("returns undefined when reading a missing entity", async () => {
    const { manager } = createManager();
    expect(await manager.read(999)).toBeUndefined();
  });

  it("updates an entity partially without touching other fields", async () => {
    const { manager } = createManager();
    const updated = await manager.update(1, { email: "alice@new.com" });
    expect(updated).toMatchObject({ id: 1, name: "alice", email: "alice@new.com" });
  });

  it("keeps the id immutable on update", async () => {
    const { manager } = createManager();
    const updated = await manager.update(1, { id: 42 } as never);
    expect(updated?.id).toBe(1);
  });

  it("deletes an entity", async () => {
    const { manager } = createManager();
    expect(await manager.delete(2)).toBe(true);
    expect(await manager.read(2)).toBeUndefined();
    expect(await manager.delete(2)).toBe(false);
  });

  it("lists entities with pagination", async () => {
    const { manager } = createManager();
    const page = await manager.list({ page: 1, pageSize: 1 });
    expect(page).toMatchObject({ total: 2, page: 1, pageSize: 1, totalPages: 2 });
    expect(page.items).toHaveLength(1);
  });

  it("returns a copy that does not mutate the store", async () => {
    const { manager } = createManager();
    const user = await manager.read(1);
    user!.name = "hacked";
    const again = await manager.read(1);
    expect(again?.name).toBe("alice");
  });

  it("exposes the underlying source name", () => {
    const { manager } = createManager();
    expect(manager.sourceName).toBe("users");
  });
});
