import { BadRequestException } from '@nestjs/common';
import { AddActionHandler } from './add-action.handler';

describe('AddActionHandler', () => {
  const handler = new AddActionHandler();
  const action = {
    type: 'ADD',
    inputs: ['a', 'b'],
    output: 'result',
  };

  it('adds two numbers', () => {
    expect(handler.execute(action, { a: 10, b: 20 })).toBe(30);
  });

  it('rejects invalid numeric input', () => {
    expect(() => handler.execute(action, { a: 10, b: '20' })).toThrow(
      new BadRequestException('ADD inputs must be valid numbers.'),
    );
  });
});
