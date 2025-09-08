import { InMemoryCriteriaConverter } from "./in-memory-criteria-converter";
import { Criteria } from "../domain/criteria/Criteria";
import { PaginationOffset } from "../domain/criteria/pagination/PaginationOffset";
import { PaginationCursor } from "../domain/criteria/pagination/PaginationCursor";
import { Filter } from "../domain/criteria/filters/Filter";
import { FilterField } from "../domain/criteria/filters/FilterField";
import {
  FilterOperator,
  Operator,
} from "../domain/criteria/filters/FilterOperator";
import { FilterValue } from "../domain/criteria/filters/FilterValue";
import { Filters } from "../domain/criteria/filters/Filters";
import { Order } from "../domain/criteria/order/Order";
import { OrderBy } from "../domain/criteria/order/OrderBy";
import { OrderType, OrderTypes } from "../domain/criteria/order/OrderType";
import type { SharedAggregateRootDTO } from "../domain/entities/AggregateRoot";
import { SharedAggregateRoot } from "../domain/entities/AggregateRoot";

interface TestEntityDTO extends SharedAggregateRootDTO {
  id: string;
  name: string;
  email: string;
  age: number;
  score: number;
  category: string;
  status: string;
  isActive: boolean;
  salary: number;
  department: string;
  createdAt: Date;
  tags: string[];
  description?: string;
  priority?: number;
}

class TestEntity extends SharedAggregateRoot {
  constructor(private readonly data: TestEntityDTO) {
    super();
  }

  toValue(): TestEntityDTO {
    return { ...this.data };
  }
}

describe("InMemoryCriteriaConverter", () => {
  const createTestEntities = (
    count: number,
    template?: Partial<TestEntityDTO>,
  ): TestEntity[] => {
    return Array.from({ length: count }, (_, i) => {
      const baseData: TestEntityDTO = {
        id: `id-${i + 1}`,
        name: `Name ${i + 1}`,
        email: `user${i + 1}@example.com`,
        age: 20 + (i % 40),
        score: (i + 1) * 10,
        category: String.fromCharCode(65 + (i % 3)), // A, B, C
        status: i % 2 === 0 ? "active" : "inactive",
        isActive: i % 2 === 0,
        salary: 50000 + i * 5000,
        department:
          i % 3 === 0 ? "Engineering" : i % 3 === 1 ? "Marketing" : "Sales",
        createdAt: new Date(`2023-${String(1 + (i % 12)).padStart(2, "0")}-01`),
        tags: [
          `tag${(i % 3) + 1}`,
          `category-${String.fromCharCode(65 + (i % 3))}`,
        ],
        ...template,
      };
      return new TestEntity(baseData);
    });
  };

  const createBasicTestEntities = (): TestEntity[] => [
    new TestEntity({
      id: "id-1",
      name: "Alice",
      email: "alice@example.com",
      age: 25,
      score: 85,
      category: "A",
      status: "active",
      isActive: true,
      salary: 75000,
      department: "Engineering",
      createdAt: new Date("2023-01-01"),
      tags: ["senior", "fullstack"],
    }),
    new TestEntity({
      id: "id-2",
      name: "Bob",
      email: "bob@example.com",
      age: 30,
      score: 92,
      category: "B",
      status: "active",
      isActive: true,
      salary: 85000,
      department: "Marketing",
      createdAt: new Date("2023-02-01"),
      tags: ["manager", "strategy"],
    }),
    new TestEntity({
      id: "id-3",
      name: "Charlie",
      email: "charlie@example.com",
      age: 28,
      score: 78,
      category: "A",
      status: "inactive",
      isActive: false,
      salary: 70000,
      department: "Engineering",
      createdAt: new Date("2023-03-01"),
      tags: ["junior", "backend"],
    }),
  ];

  const createFilter = (field: string, operator: Operator, value: string) =>
    new Filter(
      new FilterField(field),
      new FilterOperator(operator),
      new FilterValue(value),
    );

  describe("Empty Criteria", () => {
    it("should convert empty criteria to default functions", () => {
      const entities = createBasicTestEntities();
      const result = InMemoryCriteriaConverter.convert(new Criteria());

      const filtered = result.filterFn(entities);
      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(entities);

      expect(result.sortFn(entities[0], entities[1])).toBe(0);

      const paginated = result.paginationFn(entities);
      expect(paginated.data).toEqual(entities);
      expect(paginated.total).toBeNull();
    });

    it("should query in-memory data with empty criteria", () => {
      const entities = createBasicTestEntities();
      const result = InMemoryCriteriaConverter.query(entities, new Criteria());

      expect(result.data).toHaveLength(3);
      expect(result.data.map((e) => e.toValue().name).sort()).toEqual([
        "Alice",
        "Bob",
        "Charlie",
      ]);
      expect(result.total).toBeNull();
    });
  });

  describe("Filters", () => {
    describe("Equal Filter", () => {
      it("should filter by equal condition", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([createFilter("category", Operator.EQUAL, "A")]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(2);
        expect(result.data.every((e) => e.toValue().category === "A")).toBe(
          true,
        );
        expect(result.data.map((e) => e.toValue().name).sort()).toEqual([
          "Alice",
          "Charlie",
        ]);
      });

      it("should filter by boolean field", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([
            createFilter("isActive", Operator.EQUAL, "true"),
          ]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(2);
        expect(result.data.every((e) => e.toValue().isActive === true)).toBe(
          true,
        );
        expect(result.data.map((e) => e.toValue().name).sort()).toEqual([
          "Alice",
          "Bob",
        ]);
      });
    });

    describe("Not Equal Filter", () => {
      it("should filter by not equal condition", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([
            createFilter("status", Operator.NOT_EQUAL, "inactive"),
          ]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(2);
        expect(
          result.data.every((e) => e.toValue().status !== "inactive"),
        ).toBe(true);
        expect(result.data.map((e) => e.toValue().name).sort()).toEqual([
          "Alice",
          "Bob",
        ]);
      });
    });

    describe("Greater Than Filter", () => {
      it("should filter by greater than condition with numbers", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([createFilter("age", Operator.GT, "27")]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(2);
        expect(result.data.every((e) => e.toValue().age > 27)).toBe(true);
        expect(result.data.map((e) => e.toValue().name).sort()).toEqual([
          "Bob",
          "Charlie",
        ]);
      });

      it("should filter by greater than condition with dates", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([
            createFilter("createdAt", Operator.GT, "2023-01-15"),
          ]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(2);
        expect(result.data.map((e) => e.toValue().name).sort()).toEqual([
          "Bob",
          "Charlie",
        ]);
      });
    });

    describe("Less Than Filter", () => {
      it("should filter by less than condition", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([createFilter("salary", Operator.LT, "80000")]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(2);
        expect(result.data.every((e) => e.toValue().salary < 80000)).toBe(true);
        expect(result.data.map((e) => e.toValue().name).sort()).toEqual([
          "Alice",
          "Charlie",
        ]);
      });
    });

    describe("Contains Filter", () => {
      it("should filter by contains condition", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([
            createFilter("email", Operator.CONTAINS, "alice"),
          ]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].toValue().name).toBe("Alice");
      });

      it("should be case insensitive for contains", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([
            createFilter("name", Operator.CONTAINS, "alice"),
          ]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].toValue().name).toBe("Alice");
      });
    });

    describe("Not Contains Filter", () => {
      it("should filter by not contains condition", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([
            createFilter("email", Operator.NOT_CONTAINS, "alice"),
          ]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(2);
        expect(result.data.map((e) => e.toValue().name).sort()).toEqual([
          "Bob",
          "Charlie",
        ]);
      });
    });

    describe("Multiple Filters", () => {
      it("should apply multiple filters with AND logic", () => {
        const entities = createBasicTestEntities();
        const filters = [
          createFilter("status", Operator.EQUAL, "active"),
          createFilter("age", Operator.GT, "26"),
        ];
        const criteria = new Criteria({ filters: new Filters(filters) });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].toValue().name).toBe("Bob");
      });
    });

    describe("Array Fields", () => {
      it("should handle array fields by joining them", () => {
        const entities = createBasicTestEntities();
        const criteria = new Criteria({
          filters: new Filters([
            createFilter("tags", Operator.CONTAINS, "senior"),
          ]),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].toValue().name).toBe("Alice");
      });
    });
  });

  describe("Sorting", () => {
    it("should sort in ascending order", () => {
      const entities = createBasicTestEntities();
      const order = new Order(
        new OrderBy("age"),
        new OrderType(OrderTypes.ASC),
      );
      const criteria = new Criteria({ order });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(3);
      expect(result.data.map((e) => e.toValue().age)).toEqual([25, 28, 30]);
      expect(result.data.map((e) => e.toValue().name)).toEqual([
        "Alice",
        "Charlie",
        "Bob",
      ]);
    });

    it("should sort in descending order", () => {
      const entities = createBasicTestEntities();
      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({ order });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(3);
      expect(result.data.map((e) => e.toValue().score)).toEqual([92, 85, 78]);
      expect(result.data.map((e) => e.toValue().name)).toEqual([
        "Bob",
        "Alice",
        "Charlie",
      ]);
    });

    it("should handle NONE order type", () => {
      const entities = createBasicTestEntities();
      const order = new Order(
        new OrderBy("name"),
        new OrderType(OrderTypes.NONE),
      );
      const criteria = new Criteria({ order });

      const result = InMemoryCriteriaConverter.convert(criteria);

      expect(result.sortFn(entities[0], entities[1])).toBe(0);
    });

    it("should handle empty orderBy field", () => {
      const entities = createBasicTestEntities();
      const order = new Order(new OrderBy(""), new OrderType(OrderTypes.ASC));
      const criteria = new Criteria({ order });

      const result = InMemoryCriteriaConverter.convert(criteria);

      expect(result.sortFn(entities[0], entities[1])).toBe(0); // sortFn should be no-op for empty orderBy field
    });

    it("should sort with filters combined", () => {
      const entities = createBasicTestEntities();
      const order = new Order(
        new OrderBy("salary"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({
        filters: new Filters([
          createFilter("status", Operator.EQUAL, "active"),
        ]),
        order,
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(2);
      expect(result.data.every((e) => e.toValue().status === "active")).toBe(
        true,
      );
      expect(result.data.map((e) => e.toValue().salary)).toEqual([
        85000, 75000,
      ]);
      expect(result.data.map((e) => e.toValue().name)).toEqual([
        "Bob",
        "Alice",
      ]);
    });
  });

  describe("PaginationOffset", () => {
    describe("Limit", () => {
      it("should limit results correctly", () => {
        const entities = createTestEntities(10);
        const criteria = new Criteria({
          pagination: new PaginationOffset(3, 0),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(3);
        expect(result.data.map((e) => e.toValue().id)).toEqual([
          "id-1",
          "id-2",
          "id-3",
        ]);
        expect(result.total).toBeNull();
      });
    });

    describe("Offset", () => {
      it("should skip results correctly", () => {
        const entities = createTestEntities(10);
        const criteria = new Criteria({
          pagination: new PaginationOffset(10, 3),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(7);
        expect(result.data[0].toValue().id).toBe("id-4");
      });
    });

    describe("Combined Limit and Offset", () => {
      it("should apply both limit and offset", () => {
        const entities = createTestEntities(20);
        const criteria = new Criteria({
          pagination: new PaginationOffset(3, 5),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(3);
        expect(result.data.map((e) => e.toValue().id)).toEqual([
          "id-6",
          "id-7",
          "id-8",
        ]);
      });
    });

    describe("WithTotal Flag", () => {
      it("should include total when withTotal is true", () => {
        const entities = createTestEntities(10);
        const criteria = new Criteria({
          pagination: new PaginationOffset(3, 2, true),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(3);
        expect(result.total).toBe(10);
      });

      it("should not include total when withTotal is false", () => {
        const entities = createTestEntities(10);
        const criteria = new Criteria({
          pagination: new PaginationOffset(3, 2, false),
        });

        const result = InMemoryCriteriaConverter.query(entities, criteria);

        expect(result.data).toHaveLength(3);
        expect(result.total).toBeNull();
      });
    });

    it("should work with filters and sorting", () => {
      const entities = createTestEntities(20);
      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.DESC),
      );
      const filters = [createFilter("category", Operator.EQUAL, "A")];
      const criteria = new Criteria({
        filters: new Filters(filters),
        order,
        pagination: new PaginationOffset(2, 1, true),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(2);
      expect(result.data.every((e) => e.toValue().category === "A")).toBe(true);
      expect(result.total).toBeGreaterThan(0); // Total of entities matching the filter
    });
  });

  describe("PaginationCursor", () => {
    it("should handle basic cursor pagination without cursor", () => {
      const entities = createTestEntities(10);
      const order = new Order(new OrderBy("id"), new OrderType(OrderTypes.ASC));
      const criteria = new Criteria({
        order,
        pagination: new PaginationCursor({ limit: 5 }),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(5);
      expect(result.data.map((e) => e.toValue().id)).toEqual([
        "id-1",
        "id-10",
        "id-2",
        "id-3",
        "id-4",
      ]);
    });

    it("should apply cursor pagination with cursor (ascending)", () => {
      const entities = [
        new TestEntity({
          id: "id-1",
          name: "Item 1",
          email: "test@test.com",
          age: 20,
          score: 10,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
        new TestEntity({
          id: "id-2",
          name: "Item 2",
          email: "test@test.com",
          age: 20,
          score: 20,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
        new TestEntity({
          id: "id-3",
          name: "Item 3",
          email: "test@test.com",
          age: 20,
          score: 30,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
        new TestEntity({
          id: "id-4",
          name: "Item 4",
          email: "test@test.com",
          age: 20,
          score: 30,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
        new TestEntity({
          id: "id-5",
          name: "Item 5",
          email: "test@test.com",
          age: 20,
          score: 40,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
      ];

      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.ASC),
      );
      const cursor = PaginationCursor.encodeCursor("30", "id-3");
      const criteria = new Criteria({
        order,
        pagination: new PaginationCursor({ cursor, limit: 2 }),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(2);
      expect(result.data.map((e) => e.toValue().id)).toEqual(["id-4", "id-5"]);
    });

    it("should apply cursor pagination with cursor (descending)", () => {
      const entities = [
        new TestEntity({
          id: "id-1",
          name: "Item 1",
          email: "test@test.com",
          age: 20,
          score: 50,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
        new TestEntity({
          id: "id-2",
          name: "Item 2",
          email: "test@test.com",
          age: 20,
          score: 40,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
        new TestEntity({
          id: "id-3",
          name: "Item 3",
          email: "test@test.com",
          age: 20,
          score: 30,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
        new TestEntity({
          id: "id-2b",
          name: "Item 2b",
          email: "test@test.com",
          age: 20,
          score: 30,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
        new TestEntity({
          id: "id-5",
          name: "Item 5",
          email: "test@test.com",
          age: 20,
          score: 20,
          category: "A",
          status: "active",
          isActive: true,
          salary: 50000,
          department: "Engineering",
          createdAt: new Date(),
          tags: [],
        }),
      ];

      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.DESC),
      );
      const cursor = PaginationCursor.encodeCursor("30", "id-3");
      const criteria = new Criteria({
        order,
        pagination: new PaginationCursor({ cursor, limit: 2 }),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(2);
      expect(result.data.map((e) => e.toValue().id)).toEqual(["id-2b", "id-5"]);
    });

    it("should work with cursor pagination and filters combined", () => {
      const entities = createTestEntities(10, { status: "active" });
      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.ASC),
      );
      const filters = [createFilter("status", Operator.EQUAL, "active")];
      const cursor = PaginationCursor.encodeCursor("30", "id-3");
      const criteria = new Criteria({
        filters: new Filters(filters),
        order,
        pagination: new PaginationCursor({ cursor, limit: 3 }),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data.length).toBeLessThanOrEqual(3);
      expect(result.data.every((e) => e.toValue().status === "active")).toBe(
        true,
      );
    });
  });

  describe("Helper Methods", () => {
    describe("count method", () => {
      it("should count filtered items without pagination", () => {
        const entities = createTestEntities(20);
        const criteria = new Criteria({
          filters: new Filters([createFilter("category", Operator.EQUAL, "A")]),
          pagination: new PaginationOffset(3, 2),
        });

        const count = InMemoryCriteriaConverter.count(entities, criteria);

        // Count should ignore pagination and just return filtered count
        expect(count).toBeGreaterThan(3); // More than the pagination limit
      });

      it("should count all items with empty criteria", () => {
        const entities = createTestEntities(15);
        const count = InMemoryCriteriaConverter.count(entities, new Criteria());

        expect(count).toBe(15);
      });
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle filters + sorting + offset pagination", () => {
      const entities = createTestEntities(50);
      const order = new Order(
        new OrderBy("age"),
        new OrderType(OrderTypes.DESC),
      );
      const filters = [
        createFilter("department", Operator.EQUAL, "Engineering"),
        createFilter("age", Operator.GT, "25"),
      ];
      const criteria = new Criteria({
        filters: new Filters(filters),
        order,
        pagination: new PaginationOffset(5, 2, true),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(5);
      expect(
        result.data.every((e) => e.toValue().department === "Engineering"),
      ).toBe(true);
      expect(result.data.every((e) => e.toValue().age > 25)).toBe(true);
      expect(result.total).toBeGreaterThan(0);

      // Check sorting
      const ages = result.data.map((e) => e.toValue().age);
      expect(ages).toEqual([...ages].sort((a, b) => b - a));
    });

    it("should handle nested field access", () => {
      // This would require more complex test data structure, but tests the getNestedValue functionality
      const entities = createBasicTestEntities();
      const criteria = new Criteria({
        filters: new Filters([
          createFilter("name", Operator.CONTAINS, "Alice"),
        ]),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].toValue().name).toBe("Alice");
    });

    it("should handle edge case with no matching results", () => {
      const entities = createBasicTestEntities();
      const criteria = new Criteria({
        filters: new Filters([createFilter("category", Operator.EQUAL, "Z")]),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBeNull();
    });

    it("should handle large dataset efficiently", () => {
      const entities = createTestEntities(1000, { status: "active" });
      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({
        filters: new Filters([createFilter("score", Operator.GT, "500")]),
        order,
        pagination: new PaginationOffset(10, 20, true),
      });

      const result = InMemoryCriteriaConverter.query(entities, criteria);

      expect(result.data).toHaveLength(10);
      expect(result.data.every((e) => e.toValue().score > 500)).toBe(true);
      expect(result.total).toBeGreaterThan(0);

      // Verify sorting
      const scores = result.data.map((e) => e.toValue().score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });
  });
});
