import { InMemoryCriteriaConverter } from './in-memory-criteria-converter';
import {
  testCriteriaConverterContract,
  type TestEntityDTO,
} from '../domain/criteria/criteria-converter.contract';

describe('InMemoryCriteriaConverter', () => {
  testCriteriaConverterContract('InMemory Implementation', (entities: TestEntityDTO[]) => {
    return Promise.resolve(new InMemoryCriteriaConverter<TestEntityDTO>(entities));
  });
});
