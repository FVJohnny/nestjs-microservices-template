import type { Db, Collection } from "mongodb";
import { MongoClient } from "mongodb";
import { MongoCriteriaConverter } from "./mongo-criteria-converter";
import {
  Criteria,
  PaginationOffset,
  PaginationCursor,
  Filter,
  FilterField,
  FilterOperator,
  FilterValue,
  Filters,
  Operator,
  Order,
  OrderBy,
  OrderType,
  OrderTypes,
} from "@libs/nestjs-common";

interface TestDocument {
  id?: number;
  name: string;
  value: number;
  category?: string;
  status?: string;
  description?: string;
  content?: string;
  age?: number;
  price?: number;
  score?: number;
  createdAt?: Date;
}

describe("MongoCriteriaConverter", () => {
  let mongoClient: MongoClient;
  let db: Db;
  let collection: Collection;

  const TEST_DB_NAME = "criteria_converter_test_db";
  const TEST_COLLECTION_NAME = "test_items";
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    `mongodb://admin:admin123@localhost:27017/${TEST_DB_NAME}?authSource=admin`;

  const createTestDocuments = (
    count: number,
    template?: Partial<TestDocument>,
  ): TestDocument[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: (i + 1) * 10,
      category: String.fromCharCode(65 + (i % 3)),
      ...template,
    }));
  };

  const createBasicTestDocs = (): TestDocument[] => [
    { name: "Item 1", value: 10, category: "A" },
    { name: "Item 2", value: 20, category: "B" },
    { name: "Item 3", value: 30, category: "A" },
  ];

  const createFilter = (field: string, operator: Operator, value: string) =>
    new Filter(
      new FilterField(field),
      new FilterOperator(operator),
      new FilterValue(value),
    );

  beforeAll(async () => {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db(TEST_DB_NAME);
    collection = db.collection(TEST_COLLECTION_NAME);
  });

  afterAll(async () => {
    await db.dropDatabase();
    await mongoClient.close();
  });

  beforeEach(async () => {
    await collection.deleteMany({});
  });

  describe("Empty Criteria", () => {
    it("should convert empty criteria to default options", () => {
      const result = MongoCriteriaConverter.convert(new Criteria());
      expect(result.filters).toEqual([]);
      expect(result.options).toEqual({ limit: 10, skip: 0, sort: undefined });
    });

    it("should query database with empty criteria and return all documents with default pagination", async () => {
      await collection.insertMany(createBasicTestDocs());

      const results = await MongoCriteriaConverter.query(
        collection,
        new Criteria(),
      ).toArray();

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.name).sort()).toEqual([
        "Item 1",
        "Item 2",
        "Item 3",
      ]);
    });
  });

  describe("PaginationOffset", () => {
    describe("Limit", () => {
      it("should convert limit correctly", () => {
        const criteria = new Criteria({
          pagination: new PaginationOffset(5, 0),
        });
        const result = MongoCriteriaConverter.convert(criteria);
        expect(result.filters).toEqual([]);
        expect(result.options).toEqual({ limit: 5, skip: 0, sort: undefined });
      });

      it("should query database with limit and return limited results", async () => {
        await collection.insertMany(createTestDocuments(10));
        const criteria = new Criteria({
          pagination: new PaginationOffset(3, 0),
        });

        const results = await MongoCriteriaConverter.query(
          collection,
          criteria,
        ).toArray();

        expect(results).toHaveLength(3);
        expect(results.map((r) => r.id)).toEqual([1, 2, 3]);
      });
    });

    describe("Offset", () => {
      it("should convert offset correctly", () => {
        const criteria = new Criteria({
          pagination: new PaginationOffset(0, 5),
        });
        const result = MongoCriteriaConverter.convert(criteria);
        expect(result.filters).toEqual([]);
        expect(result.options).toEqual({ limit: 0, skip: 5, sort: undefined });
      });

      it("should query database with offset and skip documents", async () => {
        await collection.insertMany(createTestDocuments(10));
        const criteria = new Criteria({
          pagination: new PaginationOffset(0, 3),
        });

        const results = await MongoCriteriaConverter.query(
          collection,
          criteria,
        ).toArray();

        expect(results).toHaveLength(7); // limit is 0, returns all remaining after offset
        expect(results[0].id).toBe(4); // offset 3, so starts at id 4
      });
    });

    describe("Combined Limit and Offset", () => {
      it("should convert combined limit and offset correctly", () => {
        const criteria = new Criteria({
          pagination: new PaginationOffset(3, 5),
        });
        const result = MongoCriteriaConverter.convert(criteria);
        expect(result.filters).toEqual([]);
        expect(result.options).toEqual({ limit: 3, skip: 5, sort: undefined });
      });

      it("should query database with combined limit and offset", async () => {
        await collection.insertMany(createTestDocuments(20));
        const criteria = new Criteria({
          pagination: new PaginationOffset(3, 5),
        });

        const results = await MongoCriteriaConverter.query(
          collection,
          criteria,
        ).toArray();

        expect(results).toHaveLength(3);
        expect(results.map((r) => r.id)).toEqual([6, 7, 8]);
      });
    });

    it("should handle pagination with withTotal flag", () => {
      const testCases = [
        { limit: 5, offset: 0, withTotal: true },
        { limit: 5, offset: 0, withTotal: false },
        { limit: 10, offset: 5, withTotal: true },
        { limit: 10, offset: 5, withTotal: false },
      ];

      testCases.forEach(({ limit, offset, withTotal }) => {
        const criteria = new Criteria({
          pagination: new PaginationOffset(limit, offset, withTotal),
        });
        const result = MongoCriteriaConverter.convert(criteria);
        expect(result.filters).toEqual([]);
        expect(result.options).toEqual({
          limit: limit,
          skip: offset,
          sort: undefined,
        });
      });
    });

    it("should work with pagination and filters combined", () => {
      const filter = createFilter("category", Operator.EQUAL, "A");
      const criteria = new Criteria({
        filters: new Filters([filter]),
        pagination: new PaginationOffset(3, 2, true),
      });

      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.filters).toHaveLength(1);
      expect(result.filters[0]).toEqual({ category: "A" });
      expect(result.options).toEqual({ limit: 3, skip: 2, sort: undefined });
    });

    it("should work with pagination and sorting combined", () => {
      const order = new Order(
        new OrderBy("value"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({
        order,
        pagination: new PaginationOffset(5, 3),
      });

      const result = MongoCriteriaConverter.convert(criteria);
      expect(result.filters).toEqual([]);
      expect(result.options).toEqual({
        limit: 5,
        skip: 3,
        sort: { value: -1 },
      });
    });

    it("should handle default pagination values", () => {
      const criteria = new Criteria({ pagination: new PaginationOffset() });
      const result = MongoCriteriaConverter.convert(criteria);
      expect(result.filters).toEqual([]);
      expect(result.options).toEqual({ limit: 10, skip: 0, sort: undefined });
    });

    it("should handle edge cases gracefully", () => {
      const edgeCases = [
        { limit: -5, skip: -10 },
        { limit: 1000000, skip: 1000000 },
        { limit: 0, skip: 10 },
      ];

      edgeCases.forEach(({ limit, skip }) => {
        const criteria = new Criteria({
          pagination: new PaginationOffset(limit, skip),
        });
        const result = MongoCriteriaConverter.convert(criteria);
        expect(result.filters).toEqual([]);
        expect(result.options).toEqual({ limit: limit, skip, sort: undefined });
      });
    });

    it("should generate consistent pagination options for dataset traversal", () => {
      const pageSize = 5;
      const totalPages = 4;
      const results = [];

      for (let page = 0; page < totalPages; page++) {
        const criteria = new Criteria({
          pagination: new PaginationOffset(pageSize, page * pageSize),
        });
        results.push(MongoCriteriaConverter.convert(criteria));
      }

      expect(results).toHaveLength(4);
      const expectedSkips = [0, 5, 10, 15];
      results.forEach((result, index) => {
        expect(result.filters).toEqual([]);
        expect(result.options).toEqual({
          limit: 5,
          skip: expectedSkips[index],
          sort: undefined,
        });
      });
    });

    it("should handle pagination with complex criteria", () => {
      const filters = [
        createFilter("value", Operator.GT, "50"),
        createFilter("category", Operator.NOT_EQUAL, "B"),
      ];

      const order = new Order(
        new OrderBy("name"),
        new OrderType(OrderTypes.ASC),
      );
      const criteria = new Criteria({
        filters: new Filters(filters),
        order,
        pagination: new PaginationOffset(4, 2, true),
      });

      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.options).toEqual({ limit: 4, skip: 2, sort: { name: 1 } });
      expect(result.filters).toHaveLength(2);
      expect(result.filters[0]).toEqual({ value: { $gt: 50 } });
      expect(result.filters[1]).toEqual({ category: { $ne: "B" } });
    });
  });

  describe("PaginationCursor", () => {
    it("should convert basic cursor pagination without cursor", () => {
      const order = new Order(new OrderBy("id"), new OrderType(OrderTypes.ASC));
      const criteria = new Criteria({
        order,
        pagination: new PaginationCursor({ limit: 5 }),
      });
      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.options.limit).toBe(5);
      expect(result.options.skip).toBeUndefined();
      expect(result.options.sort).toEqual({ id: 1 }); // cursor pagination adds id sort
      expect(result.filters).toEqual([]);
    });

    it("should apply cursor pagination with cursor", () => {
      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.ASC),
      );
      const cursor = PaginationCursor.encodeCursor("30", "3");
      const criteria = new Criteria({
        order,
        pagination: new PaginationCursor({ limit: 3, cursor }),
      });

      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.options).toEqual({ limit: 3, sort: { score: 1, id: 1 } });
      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].$or).toHaveLength(2);
      expect(result.filters[0].$or![0]).toEqual({ score: { $gt: 30 } });
      expect(result.filters[0].$or![1]).toEqual({
        score: 30,
        id: { $gt: "3" },
      });
    });

    it("should handle cursor pagination with descending order", () => {
      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.DESC),
      );
      const cursor = PaginationCursor.encodeCursor("70", "7");
      const criteria = new Criteria({
        order,
        pagination: new PaginationCursor({ limit: 3, cursor }),
      });

      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.options).toEqual({ limit: 3, sort: { score: -1, id: -1 } });
      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].$or).toHaveLength(2);
      expect(result.filters[0].$or![0]).toEqual({ score: { $lt: 70 } });
      expect(result.filters[0].$or![1]).toEqual({
        score: 70,
        id: { $lt: "7" },
      });
    });

    it("should work with cursor pagination and filters combined", () => {
      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.ASC),
      );
      const cursor = PaginationCursor.encodeCursor("50", "5");
      const criteria = new Criteria({
        filters: new Filters([createFilter("score", Operator.GT, "20")]),
        order,
        pagination: new PaginationCursor({ limit: 2, cursor }),
      });

      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.options).toEqual({ limit: 2, sort: { score: 1, id: 1 } });
      expect(result.filters).toHaveLength(2);
      expect(result.filters[0]).toEqual({ score: { $gt: 20 } });
      expect(result.filters[1].$or).toHaveLength(2);
      expect(result.filters[1].$or![0]).toEqual({ score: { $gt: 50 } });
      expect(result.filters[1].$or![1]).toEqual({
        score: 50,
        id: { $gt: "5" },
      });
    });

    it("should query database with cursor pagination ascending order", async () => {
      const testDocs = [
        { id: "1", score: 10, name: "Item 1" },
        { id: "2", score: 20, name: "Item 2" },
        { id: "3", score: 30, name: "Item 3" },
        { id: "4", score: 40, name: "Item 4" },
        { id: "5", score: 50, name: "Item 5" },
        { id: "6", score: 60, name: "Item 6" },
      ];
      await collection.insertMany(testDocs);

      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.ASC),
      );
      const cursor = PaginationCursor.encodeCursor("30", "3");
      const criteria = new Criteria({
        order,
        pagination: new PaginationCursor({ limit: 2, cursor }),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(40);
      expect(results[0].id).toBe("4");
      expect(results[1].score).toBe(50);
      expect(results[1].id).toBe("5");
    });

    it("should query database with cursor pagination descending order", async () => {
      const testDocs = [
        { id: "1", priority: 90, task: "High Priority Task" },
        { id: "2", priority: 80, task: "Medium High Task" },
        { id: "3", priority: 70, task: "Medium Task" },
        { id: "4", priority: 60, task: "Medium Low Task" },
        { id: "5", priority: 50, task: "Low Priority Task" },
      ];
      await collection.insertMany(testDocs);

      const order = new Order(
        new OrderBy("priority"),
        new OrderType(OrderTypes.DESC),
      );
      const cursor = PaginationCursor.encodeCursor("80", "2");
      const criteria = new Criteria({
        order,
        pagination: new PaginationCursor({ limit: 2, cursor }),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(2);
      expect(results[0].priority).toBe(70);
      expect(results[0].id).toBe("3");
      expect(results[1].priority).toBe(60);
      expect(results[1].id).toBe("4");
    });

    it("should query database with cursor pagination and filters", async () => {
      const testDocs = [
        { id: "1", category: "A", score: 15, active: true },
        { id: "2", category: "A", score: 25, active: true },
        { id: "3", category: "B", score: 35, active: true },
        { id: "4", category: "A", score: 45, active: false },
        { id: "5", category: "A", score: 55, active: true },
        { id: "6", category: "A", score: 65, active: true },
      ];
      await collection.insertMany(testDocs);

      const order = new Order(
        new OrderBy("score"),
        new OrderType(OrderTypes.ASC),
      );
      const filters = [
        createFilter("category", Operator.EQUAL, "A"),
        createFilter("active", Operator.EQUAL, "true"),
      ];
      const criteria = new Criteria({
        filters: new Filters(filters),
        order,
        pagination: new PaginationCursor({
          limit: 2,
          cursor: PaginationCursor.encodeCursor("25", "2"),
        }),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(2);
      expect(
        results.every((r) => r.category === "A" && r.active === true),
      ).toBe(true);
      expect(results.map((r) => r.id)).toEqual(["5", "6"]);
      expect(results.map((r) => r.score)).toEqual([55, 65]);
    });
  });

  describe("Filters", () => {
    describe("Equal Filter", () => {
      it("should convert equal filter correctly", () => {
        const criteria = new Criteria({
          filters: new Filters([createFilter("name", Operator.EQUAL, "test")]),
        });
        const result = MongoCriteriaConverter.convert(criteria);

        expect(result.filters).toHaveLength(1);
        expect(result.filters[0]).toEqual({ name: "test" });
        expect(result.options).toEqual({ limit: 10, skip: 0, sort: undefined });
      });

      it("should query database with equal filter and return matching documents", async () => {
        const testDocs = [
          { name: "test", value: 10, category: "A" },
          { name: "other", value: 20, category: "B" },
          { name: "test", value: 30, category: "C" },
        ];
        await collection.insertMany(testDocs);

        const criteria = new Criteria({
          filters: new Filters([createFilter("name", Operator.EQUAL, "test")]),
        });
        const results = await MongoCriteriaConverter.query(
          collection,
          criteria,
        ).toArray();

        expect(results).toHaveLength(2);
        expect(results.every((r) => r.name === "test")).toBe(true);
        expect(results.map((r) => r.value).sort()).toEqual([10, 30]);
      });
    });

    const testFilterConversion = (
      field: string,
      operator: Operator,
      value: string,
      expectedFilter: object,
    ) => {
      const criteria = new Criteria({
        filters: new Filters([createFilter(field, operator, value)]),
      });
      const result = MongoCriteriaConverter.convert(criteria);
      expect(result.filters).toEqual([expectedFilter]);
      expect(result.options).toEqual({ limit: 10, skip: 0, sort: undefined });
    };

    it("should convert not equal filter", () => {
      testFilterConversion("status", Operator.NOT_EQUAL, "inactive", {
        status: { $ne: "inactive" },
      });
    });

    it("should convert contains filter", () => {
      testFilterConversion("description", Operator.CONTAINS, "search", {
        description: { $regex: "search", $options: "i" },
      });
    });

    it("should convert not contains filter", () => {
      testFilterConversion("content", Operator.NOT_CONTAINS, "spam", {
        content: { $not: { $regex: "spam", $options: "i" } },
      });
    });

    it("should convert greater than filter", () => {
      testFilterConversion("age", Operator.GT, "18", { age: { $gt: 18 } });
    });

    it("should convert less than filter", () => {
      testFilterConversion("price", Operator.LT, "100.50", {
        price: { $lt: 100.5 },
      });
    });

    it("should convert multiple filters", () => {
      const filters = [
        createFilter("status", Operator.EQUAL, "active"),
        createFilter("age", Operator.GT, "21"),
      ];

      const criteria = new Criteria({ filters: new Filters(filters) });
      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.filters).toEqual([
        { status: "active" },
        { age: { $gt: 21 } },
      ]);
      expect(result.options).toEqual({ limit: 10, skip: 0, sort: undefined });
    });

    it("should query database with not equal filter", async () => {
      const testDocs = [
        { name: "active-user", status: "active" },
        { name: "inactive-user", status: "inactive" },
        { name: "pending-user", status: "pending" },
      ];
      await collection.insertMany(testDocs);

      const criteria = new Criteria({
        filters: new Filters([
          createFilter("status", Operator.NOT_EQUAL, "inactive"),
        ]),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status !== "inactive")).toBe(true);
      expect(results.map((r) => r.name).sort()).toEqual([
        "active-user",
        "pending-user",
      ]);
    });

    it("should query database with contains filter", async () => {
      const testDocs = [
        { title: "JavaScript Tutorial", content: "Learn JavaScript basics" },
        { title: "Python Guide", content: "Advanced Python techniques" },
        { title: "Java Handbook", content: "Complete Java reference" },
      ];
      await collection.insertMany(testDocs);

      const criteria = new Criteria({
        filters: new Filters([
          createFilter("title", Operator.CONTAINS, "java"),
        ]),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.title).sort()).toEqual([
        "Java Handbook",
        "JavaScript Tutorial",
      ]);
    });

    it("should query database with greater than filter", async () => {
      const testDocs = createTestDocuments(10);
      await collection.insertMany(testDocs);

      const criteria = new Criteria({
        filters: new Filters([createFilter("value", Operator.GT, "50")]),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.value > 50)).toBe(true);
      expect(results.map((r) => r.id).sort((a, b) => a - b)).toEqual([
        6, 7, 8, 9, 10,
      ]);
    });

    it("should query database with less than filter", async () => {
      const testDocs = [
        { product: "Budget Item", price: 25.99 },
        { product: "Mid Item", price: 75.5 },
        { product: "Premium Item", price: 125.0 },
        { product: "Cheap Item", price: 15.25 },
      ];
      await collection.insertMany(testDocs);

      const criteria = new Criteria({
        filters: new Filters([createFilter("price", Operator.LT, "50")]),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.price < 50)).toBe(true);
      expect(results.map((r) => r.product).sort()).toEqual([
        "Budget Item",
        "Cheap Item",
      ]);
    });

    it("should query database with multiple filters combined", async () => {
      const testDocs = [
        { name: "John", age: 25, status: "active", department: "engineering" },
        { name: "Jane", age: 30, status: "active", department: "marketing" },
        { name: "Bob", age: 35, status: "inactive", department: "engineering" },
        { name: "Alice", age: 28, status: "active", department: "engineering" },
        { name: "Tom", age: 22, status: "active", department: "sales" },
      ];
      await collection.insertMany(testDocs);

      const filters = [
        createFilter("status", Operator.EQUAL, "active"),
        createFilter("age", Operator.GT, "25"),
        createFilter("department", Operator.EQUAL, "engineering"),
      ];
      const criteria = new Criteria({ filters: new Filters(filters) });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Alice");
      expect(results[0].age).toBe(28);
      expect(results[0].status).toBe("active");
      expect(results[0].department).toBe("engineering");
    });
  });

  describe("Sorting", () => {
    it("should convert ascending sort", () => {
      const order = new Order(
        new OrderBy("name"),
        new OrderType(OrderTypes.ASC),
      );
      const criteria = new Criteria({ order });
      const result = MongoCriteriaConverter.convert(criteria);
      expect(result.filters).toEqual([]);
      expect(result.options).toEqual({ limit: 10, skip: 0, sort: { name: 1 } });
    });

    it("should convert descending sort", () => {
      const order = new Order(
        new OrderBy("createdAt"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({ order });
      const result = MongoCriteriaConverter.convert(criteria);
      expect(result.filters).toEqual([]);
      expect(result.options).toEqual({
        limit: 10,
        skip: 0,
        sort: { createdAt: -1 },
      });
    });

    it("should not add sort for empty orderBy field", () => {
      const order = new Order(new OrderBy(""), new OrderType(OrderTypes.ASC));
      const criteria = new Criteria({ order });
      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.options.sort).toBeUndefined();
      expect(result.filters).toEqual([]);
    });

    it("should not add sort for none orderType", () => {
      const order = new Order(
        new OrderBy("name"),
        new OrderType(OrderTypes.NONE),
      );
      const criteria = new Criteria({ order });
      const result = MongoCriteriaConverter.convert(criteria);

      expect(result.options.sort).toBeUndefined();
      expect(result.filters).toEqual([]);
    });

    it("should query database with ascending sort", async () => {
      const testDocs = [
        { name: "Charlie", score: 75 },
        { name: "Alice", score: 90 },
        { name: "Bob", score: 85 },
        { name: "David", score: 70 },
      ];
      await collection.insertMany(testDocs);

      const order = new Order(
        new OrderBy("name"),
        new OrderType(OrderTypes.ASC),
      );
      const criteria = new Criteria({ order });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.name)).toEqual([
        "Alice",
        "Bob",
        "Charlie",
        "David",
      ]);
    });

    it("should query database with descending sort", async () => {
      const testDocs = [
        { product: "Widget A", price: 25.99, rating: 4.2 },
        { product: "Widget B", price: 15.5, rating: 4.8 },
        { product: "Widget C", price: 35.0, rating: 3.9 },
        { product: "Widget D", price: 45.25, rating: 4.5 },
      ];
      await collection.insertMany(testDocs);

      const order = new Order(
        new OrderBy("price"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({ order });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.price)).toEqual([45.25, 35.0, 25.99, 15.5]);
      expect(results.map((r) => r.product)).toEqual([
        "Widget D",
        "Widget C",
        "Widget A",
        "Widget B",
      ]);
    });

    it("should query database with sort and filters combined", async () => {
      const testDocs = [
        { employee: "John", department: "eng", salary: 85000, experience: 5 },
        { employee: "Jane", department: "eng", salary: 92000, experience: 7 },
        { employee: "Bob", department: "sales", salary: 75000, experience: 3 },
        { employee: "Alice", department: "eng", salary: 88000, experience: 4 },
        { employee: "Tom", department: "eng", salary: 95000, experience: 8 },
      ];
      await collection.insertMany(testDocs);

      const order = new Order(
        new OrderBy("salary"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({
        filters: new Filters([
          createFilter("department", Operator.EQUAL, "eng"),
        ]),
        order,
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(4);
      expect(results.every((r) => r.department === "eng")).toBe(true);
      expect(results.map((r) => r.employee)).toEqual([
        "Tom",
        "Jane",
        "Alice",
        "John",
      ]);
      expect(results.map((r) => r.salary)).toEqual([
        95000, 92000, 88000, 85000,
      ]);
    });
  });

  describe("Count Method", () => {
    it("should count all documents when no filters applied", async () => {
      await collection.insertMany(createBasicTestDocs());

      const count = await MongoCriteriaConverter.count(
        collection,
        new Criteria(),
      );

      expect(count).toBe(3);
    });

    it("should count filtered documents", async () => {
      await collection.insertMany(createBasicTestDocs());

      const criteria = new Criteria({
        filters: new Filters([createFilter("category", Operator.EQUAL, "A")]),
      });
      const count = await MongoCriteriaConverter.count(collection, criteria);

      expect(count).toBe(2);
    });

    it("should return 0 when no documents match filters", async () => {
      const testDocs = [
        { name: "Item 1", value: 10, category: "A" },
        { name: "Item 2", value: 20, category: "B" },
      ];
      await collection.insertMany(testDocs);

      const criteria = new Criteria({
        filters: new Filters([createFilter("category", Operator.EQUAL, "C")]),
      });
      const count = await MongoCriteriaConverter.count(collection, criteria);

      expect(count).toBe(0);
    });
  });

  describe("Complex Query Scenarios", () => {
    it("should query database with offset pagination, filters, and sorting", async () => {
      const testDocs = [
        {
          name: "Alice",
          department: "Engineering",
          salary: 95000,
          joinDate: new Date("2020-01-15"),
        },
        {
          name: "Bob",
          department: "Engineering",
          salary: 87000,
          joinDate: new Date("2019-03-10"),
        },
        {
          name: "Charlie",
          department: "Marketing",
          salary: 78000,
          joinDate: new Date("2021-06-20"),
        },
        {
          name: "Diana",
          department: "Engineering",
          salary: 92000,
          joinDate: new Date("2020-08-05"),
        },
        {
          name: "Eve",
          department: "Engineering",
          salary: 89000,
          joinDate: new Date("2018-11-30"),
        },
        {
          name: "Frank",
          department: "Sales",
          salary: 76000,
          joinDate: new Date("2021-02-14"),
        },
        {
          name: "Grace",
          department: "Engineering",
          salary: 98000,
          joinDate: new Date("2019-09-25"),
        },
      ];
      await collection.insertMany(testDocs);

      const order = new Order(
        new OrderBy("salary"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({
        filters: new Filters([
          createFilter("department", Operator.EQUAL, "Engineering"),
        ]),
        order,
        pagination: new PaginationOffset(2, 1),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.department === "Engineering")).toBe(true);
      expect(results.map((r) => r.name)).toEqual(["Alice", "Diana"]);
      expect(results.map((r) => r.salary)).toEqual([95000, 92000]);
    });

    it("should handle complex text search with multiple operators", async () => {
      const testDocs = [
        {
          title: "Advanced JavaScript Patterns",
          content: "Deep dive into JS",
          category: "programming",
          views: 1500,
        },
        {
          title: "Python for Beginners",
          content: "Learn Python basics",
          category: "programming",
          views: 2800,
        },
        {
          title: "Marketing Strategies",
          content: "Business growth tips",
          category: "business",
          views: 900,
        },
        {
          title: "JavaScript Testing Guide",
          content: "Unit testing in JS",
          category: "programming",
          views: 1200,
        },
        {
          title: "Advanced Python Techniques",
          content: "Pro Python tips",
          category: "programming",
          views: 2100,
        },
      ];
      await collection.insertMany(testDocs);

      const filters = [
        createFilter("title", Operator.CONTAINS, "advanced"),
        createFilter("category", Operator.EQUAL, "programming"),
        createFilter("views", Operator.GT, "1000"),
      ];
      const order = new Order(
        new OrderBy("views"),
        new OrderType(OrderTypes.DESC),
      );
      const criteria = new Criteria({ filters: new Filters(filters), order });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(2);
      expect(
        results.every((r) => r.category === "programming" && r.views > 1000),
      ).toBe(true);
      expect(results.map((r) => r.title)).toEqual([
        "Advanced Python Techniques",
        "Advanced JavaScript Patterns",
      ]);
      expect(results.map((r) => r.views)).toEqual([2100, 1500]);
    });

    it("should handle edge case with no results and various criteria", async () => {
      await collection.insertMany(createBasicTestDocs());

      const filters = [
        createFilter("category", Operator.EQUAL, "Z"),
        createFilter("value", Operator.GT, "100"),
      ];
      const order = new Order(
        new OrderBy("name"),
        new OrderType(OrderTypes.ASC),
      );
      const criteria = new Criteria({
        filters: new Filters(filters),
        order,
        pagination: new PaginationOffset(10, 0),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(0);
    });

    it("should handle large dataset with efficient pagination", async () => {
      const largeDataset = createTestDocuments(100, { status: "active" });
      await collection.insertMany(largeDataset);

      const order = new Order(
        new OrderBy("value"),
        new OrderType(OrderTypes.ASC),
      );
      const criteria = new Criteria({
        filters: new Filters([createFilter("value", Operator.GT, "500")]),
        order,
        pagination: new PaginationOffset(10, 20),
      });
      const results = await MongoCriteriaConverter.query(
        collection,
        criteria,
      ).toArray();

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.value > 500)).toBe(true);
      expect(results.every((r) => r.status === "active")).toBe(true);
      expect(results[0].id).toBe(71); // 51st item (skipped first 20 of filtered results)
      expect(results[9].id).toBe(80); // 60th item
      expect(results.map((r) => r.value)).toEqual([
        710, 720, 730, 740, 750, 760, 770, 780, 790, 800,
      ]);
    });
  });
});
